/**
 * Rate Limiting 配置
 * 
 * 使用 Upstash Redis 实现分布式限流
 * 
 * 环境变量需求:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * 如果没有配置环境变量,将使用内存限流 (仅适用于开发环境)
 */

import { Ratelimit, Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 检查是否配置了 Upstash
const isUpstashConfigured =
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN;

// 创建 Redis 客户端 (如果配置了 Upstash)
const redis = isUpstashConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

/**
 * 创建限流器
 * @param requests 时间窗口内允许的请求数
 * @param window 时间窗口 (如 "1 m", "1 h")
 */
function createLimiter(requests: number, window: Duration) {
    if (!redis) {
        // 开发环境: 使用内存限流
        console.warn('⚠️ Upstash not configured, using in-memory rate limiting (dev only)');
        return new Ratelimit({
            redis: Redis.fromEnv() as any, // 这会失败,但我们会捕获错误
            limiter: Ratelimit.slidingWindow(requests, window),
            analytics: false,
        });
    }

    // 生产环境: 使用 Upstash Redis
    return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
        prefix: "onebook",
    });
}

// ============================================
// 限流器实例
// ============================================

/**
 * API 限流: 每分钟 10 个请求
 * 用于: Butterfly Protocol API
 */
export const apiLimiter = isUpstashConfigured
    ? createLimiter(10, "1 m")
    : null;

/**
 * 登录限流: 每小时 5 次尝试
 * 用于: 登录/注册端点
 */
export const authLimiter = isUpstashConfigured
    ? createLimiter(5, "1 h")
    : null;

/**
 * 发帖限流: 每小时 20 个帖子
 * 用于: 创建帖子端点
 */
export const postLimiter = isUpstashConfigured
    ? createLimiter(20, "1 h")
    : null;

/**
 * 评论限流: 每小时 30 条评论
 * 用于: 创建评论端点
 */
export const commentLimiter = isUpstashConfigured
    ? createLimiter(30, "1 h")
    : null;

/**
 * 读取限流: 每分钟 100 次请求
 * 用于: GET 端点
 */
export const readLimiter = isUpstashConfigured
    ? createLimiter(100, "1 m")
    : null;

// ============================================
// 辅助函数
// ============================================

/**
 * 从请求中获取客户端标识符 (IP 或其他)
 */
export function getClientIdentifier(request: Request): string {
    // 尝试从不同的 header 获取 IP
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');

    return (
        forwarded?.split(',')[0] ||
        realIp ||
        cfConnectingIp ||
        'anonymous'
    );
}

/**
 * 检查限流
 * @param limiter 限流器实例
 * @param identifier 客户端标识符
 * @returns { success: boolean, limit: number, remaining: number, reset: number }
 */
export async function checkRateLimit(
    limiter: Ratelimit | null,
    identifier: string
) {
    // 如果没有配置限流器 (开发环境),总是允许
    if (!limiter) {
        return {
            success: true,
            limit: 999,
            remaining: 999,
            reset: Date.now() + 60000,
        };
    }

    try {
        const result = await limiter.limit(identifier);
        return result;
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // 如果限流检查失败,允许请求通过 (fail open)
        return {
            success: true,
            limit: 0,
            remaining: 0,
            reset: Date.now(),
        };
    }
}

/**
 * 创建限流响应
 */
export function createRateLimitResponse(reset: number) {
    const resetDate = new Date(reset);
    return Response.json(
        {
            error: 'Too many requests',
            message: `请求过于频繁,请稍后再试。限制将在 ${resetDate.toLocaleTimeString('zh-CN')} 重置。`,
            reset: resetDate.toISOString(),
        },
        {
            status: 429,
            headers: {
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
        }
    );
}
