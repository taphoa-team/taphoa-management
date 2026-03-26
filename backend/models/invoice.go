package models

import "time"

type Invoice struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	UserID          uint      `json:"user_id" gorm:"not null"`
	User            User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	ShiftID         uint      `json:"shift_id" gorm:"not null"`
	CustomerID      *uint     `json:"customer_id"`                              // NULL = khách lẻ
	Customer        *Customer `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	Total           int       `json:"total" gorm:"not null"`
	DiscountAmount  int       `json:"discount_amount" gorm:"default:0"`
	FinalTotal      int       `json:"final_total" gorm:"not null"`              // total - discount_amount
	CashAmount      int       `json:"cash_amount" gorm:"default:0"`
	TransferAmount  int       `json:"transfer_amount" gorm:"default:0"`
	CashGiven       int       `json:"cash_given" gorm:"default:0"`              // tiền khách đưa
	ChangeAmount    int       `json:"change_amount" gorm:"default:0"`           // tiền thừa
	PaymentMethod   string    `json:"payment_method" gorm:"size:20;not null"`   // cash/transfer/mixed/debt
	Status          string    `json:"status" gorm:"size:20;default:completed"`
	Note            *string   `json:"note"`
	CreatedAt       time.Time `json:"created_at"`

	// Quan hệ
	Items []InvoiceItem `json:"items,omitempty" gorm:"foreignKey:InvoiceID"`
}
