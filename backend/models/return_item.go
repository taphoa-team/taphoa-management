package models

type ReturnItem struct {
	ID          uint    `json:"id" gorm:"primaryKey"`
	ReturnID    uint    `json:"return_id" gorm:"not null;index"`
	ProductID   uint    `json:"product_id" gorm:"not null"`
	Product     Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	BatchID     uint    `json:"batch_id" gorm:"not null"`
	Quantity    int     `json:"quantity" gorm:"not null"`
	RefundPrice int     `json:"refund_price" gorm:"not null"`
}
