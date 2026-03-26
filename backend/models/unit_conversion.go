package models

type UnitConversion struct {
	ID             uint    `json:"id" gorm:"primaryKey"`
	ProductID      uint    `json:"product_id" gorm:"not null;index"`
	Product        Product `json:"-" gorm:"foreignKey:ProductID"`
	FromUnit       string  `json:"from_unit" gorm:"size:20;not null"` // thùng, lốc
	ToUnit         string  `json:"to_unit" gorm:"size:20;not null"`   // chai, gói
	ConversionRate int     `json:"conversion_rate" gorm:"not null"`   // 1 thùng = ? chai
}
