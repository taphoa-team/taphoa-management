package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/middleware"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// --- Request structs ---

type LoginRequest struct {
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin staff"`
}

// --- Handlers ---

// Login — đăng nhập bằng SĐT + mật khẩu → trả JWT token
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu SĐT hoặc mật khẩu"})
		return
	}

	// Tìm user theo SĐT
	var user models.User
	if err := config.DB.Where("phone = ?", req.Phone).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "SĐT hoặc mật khẩu sai"})
		return
	}

	// So sánh mật khẩu
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "SĐT hoặc mật khẩu sai"})
		return
	}

	// Tạo JWT token
	token, err := middleware.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// Register — tạo tài khoản mới (chỉ admin mới được gọi)
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	// Kiểm tra SĐT đã tồn tại chưa
	var existing models.User
	if err := config.DB.Where("phone = ?", req.Phone).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "SĐT đã được đăng ký"})
		return
	}

	// Mã hóa mật khẩu
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không mã hóa được mật khẩu"})
		return
	}

	user := models.User{
		Name:     req.Name,
		Phone:    req.Phone,
		Password: string(hashedPassword),
		Role:     req.Role,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được tài khoản"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Tạo tài khoản thành công",
		"user":    user,
	})
}

// GetMe — lấy thông tin user đang đăng nhập
func GetMe(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}
