package models

type InvoiceItem struct {
	ID        uint    `json:"id" gorm:"primaryKey"`
	InvoiceID uint    `json:"invoice_id" gorm:"not null;index"`
	ProductID uint    `json:"product_id" gorm:"not null"`
	Product   Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	BatchID   uint    `json:"batch_id" gorm:"not null"`
	Quantity  int     `json:"quantity" gorm:"not null"`
	Unit      string  `json:"unit" gorm:"size:20;not null"` // đơn vị bán (chai, lốc, thùng)
	Price     int     `json:"price" gorm:"not null"`        // giá bán tại thời điểm mua
	CostPrice int     `json:"cost_price" gorm:"not null"`   // giá vốn tại thời điểm mua
}
