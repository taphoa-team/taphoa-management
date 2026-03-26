package models

import "time"

type Return struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	InvoiceID   uint      `json:"invoice_id" gorm:"not null"`
	Invoice     Invoice   `json:"invoice,omitempty" gorm:"foreignKey:InvoiceID"`
	UserID      uint      `json:"user_id" gorm:"not null"`
	User        User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Reason      string    `json:"reason" gorm:"type:text;not null"`
	TotalRefund int       `json:"total_refund" gorm:"not null"`
	Status      string    `json:"status" gorm:"size:20;default:completed"`
	CreatedAt   time.Time `json:"created_at"`

	// Quan hệ
	Items []ReturnItem `json:"items,omitempty" gorm:"foreignKey:ReturnID"`
}
