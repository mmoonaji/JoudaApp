-- Add discussion_message_id to customer_orders table for tracking discussion thread cards
ALTER TABLE customer_orders ADD COLUMN discussion_message_id bigint;
