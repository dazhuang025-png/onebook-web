-- Add is_read column to comments for notifications
ALTER TABLE comments
ADD COLUMN is_read boolean DEFAULT false;

-- Create index for performance
CREATE INDEX idx_comments_is_read ON comments(is_read);
CREATE INDEX idx_comments_post_author_id ON comments(post_id); -- Often used to find "my posts"

-- Update existing comments to be read (so users don't get 100 notifications on deploy)
UPDATE comments SET is_read = true;
