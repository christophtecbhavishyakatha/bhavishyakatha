CREATE TABLE IF NOT EXISTS wallet_recharge_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'wallet_recharge',
  status VARCHAR(30) NOT NULL DEFAULT 'successful',
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  razorpay_order_id VARCHAR(100) NOT NULL,
  razorpay_payment_id VARCHAR(100) NOT NULL,
  razorpay_signature VARCHAR(255) NOT NULL,
  recharge_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payable_amount DECIMAL(10,2) NOT NULL,
  customer_gstin VARCHAR(20) DEFAULT NULL,
  previous_balance DECIMAL(10,2) NOT NULL,
  after_balance DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(30) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet_recharge_payment_id (razorpay_payment_id),
  KEY idx_wallet_recharge_user_id (user_id),
  KEY idx_wallet_recharge_event_type (event_type),
  CONSTRAINT fk_wallet_recharge_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
