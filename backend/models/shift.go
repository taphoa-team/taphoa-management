package models

import "time"

type Shift struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	UserID        uint       `json:"user_id" gorm:"not null;index:idx_shift_user_open,priority:1"`
	User          User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	CashierName   string     `json:"cashier_name" gorm:"size:100"`           // tên nhân viên bán ca
	OpeningCash   int        `json:"opening_cash" gorm:"not null"`           // tiền đầu ca
	ClosingCash   *int       `json:"closing_cash"`                           // tiền cuối ca (NULL = ca đang mở)
	ExpectedCash  *int       `json:"expected_cash"`                          // tiền lý thuyết
	Difference    *int       `json:"difference"`                             // chênh lệch
	TotalSales    int        `json:"total_sales" gorm:"default:0"`
	TotalInvoices int        `json:"total_invoices" gorm:"default:0"`
	Note          *string    `json:"note"`
	OpenedAt      time.Time  `json:"opened_at"`
	ClosedAt      *time.Time `json:"closed_at" gorm:"index:idx_shift_user_open,priority:2"` // NULL = ca đang mở
}
