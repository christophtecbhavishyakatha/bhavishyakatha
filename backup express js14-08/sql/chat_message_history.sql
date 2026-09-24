CREATE TABLE IF NOT EXISTS chat_message_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id VARCHAR(255) NOT NULL,
  call_id BIGINT UNSIGNED NOT NULL,
  message_id VARCHAR(120) NOT NULL,
  sender_type ENUM('user', 'astrologer') NOT NULL,
  sender_id VARCHAR(120) DEFAULT NULL,
  message_text TEXT NOT NULL,
  message_type ENUM('text', 'image') NOT NULL DEFAULT 'text',
  image_url VARCHAR(500) DEFAULT NULL,
  sent_at DATETIME(3) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_room_message (room_id, message_id),
  KEY idx_room_sent (room_id, sent_at DESC, id DESC),
  KEY idx_call_sent (call_id, sent_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
