package models

import "time"

type Discount struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	Name      string     `json:"name" gorm:"size:100;not null"`
	Type      string     `json:"type" gorm:"size:20;not null"`  // percent / fixed
	Value     int        `json:"value" gorm:"not null"`         // 10 = 10% hoặc 5000 = giảm 5000đ
	MinOrder  int        `json:"min_order" gorm:"default:0"`    // đơn tối thiểu
	ProductID *uint      `json:"product_id"`                    // NULL = áp dụng cả đơn
	Product   *Product   `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	StartDate time.Time  `json:"start_date" gorm:"not null"`
	EndDate   time.Time  `json:"end_date" gorm:"not null"`
	IsActive  bool       `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time  `json:"created_at"`
}
