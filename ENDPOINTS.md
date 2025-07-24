# 🚀 UretiX API Endpoints Dokümantasyonu

## 📋 Genel Bilgiler

- **Base URL**: `http://localhost:5000/api`
- **Authentication**: JWT Token (Bearer Token)
- **Content-Type**: `application/json`

---

## 🔐 Authentication Endpoints

### POST `/auth/register`

**Kullanıcı Kaydı**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+905551234567",
  "role": "producer" // "producer", "admin", "superadmin"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "producer"
    },
    "token": "jwt_token_here"
  }
}
```

### POST `/auth/login`

**Kullanıcı Girişi**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "producer"
    },
    "token": "jwt_token_here"
  }
}
```

### GET `/auth/me`

**Mevcut Kullanıcı Bilgileri**
**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "producer",
      "phone": "+905551234567",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 👤 Producer Endpoints

### GET `/producer/my-shop-window`

**Vitrin Bilgilerini Getir**
**Headers:** `Authorization: Bearer <token>`

**Response:**

```json
{
  "success": true,
  "data": {
    "producer": {
      "id": "producer_id",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+905551234567",
      "gender": "male",
      "backupPhone": "+905559876543"
    },
    "storefront": {
      "id": "storefront_id",
      "companyName": "ABC Manufacturing",
      "aboutUs": "We are a leading manufacturer...",
      "serviceDetails": "We provide high-quality products...",
      "interestTags": ["textile", "automotive", "electronics"],
      "shippingMethod": "express",
      "customProduction": true,
      "sampleDelivery": true,
      "videoUrl": "https://s3.amazonaws.com/video.mp4",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT `/producer/my-shop-window`

**Vitrin Bilgilerini Güncelle**
**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "producer": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+905551234567",
    "gender": "male",
    "backupPhone": "+905559876543"
  },
  "storefront": {
    "companyName": "ABC Manufacturing",
    "aboutUs": "We are a leading manufacturer...",
    "serviceDetails": "We provide high-quality products...",
    "interestTags": ["textile", "automotive", "electronics"],
    "shippingMethod": "express",
    "customProduction": true,
    "sampleDelivery": true
  }
}
```

### POST `/producer/my-shop-window/video`

**Vitrin Videosu Yükle**
**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**

- `video`: Video dosyası (MP4, AVI, MOV)

**Response:**

```json
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "videoUrl": "https://s3.amazonaws.com/video.mp4"
  }
}
```

---

## 👨‍💼 Admin Endpoints

### GET `/admin/users`

**Tüm Kullanıcıları Listele**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Query Parameters:**

- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına kayıt (default: 10)
- `role`: Rol filtresi (producer, admin, superadmin)
- `search`: Arama terimi

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "producer",
        "phone": "+905551234567",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET `/admin/users/:id`

**Kullanıcı Detaylarını Getir**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "producer",
      "phone": "+905551234567",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT `/admin/users/:id`

**Kullanıcı Bilgilerini Güncelle**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+905551234567",
  "role": "producer"
}
```

### DELETE `/admin/users/:id`

**Kullanıcıyı Sil**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Response:**

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### GET `/admin/producers`

**Tüm Üreticileri Listele**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Query Parameters:**

- `page`: Sayfa numarası (default: 1)
- `limit`: Sayfa başına kayıt (default: 10)
- `search`: Arama terimi

**Response:**

```json
{
  "success": true,
  "data": {
    "producers": [
      {
        "id": "producer_id",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phone": "+905551234567",
        "gender": "male",
        "backupPhone": "+905559876543",
        "storefront": {
          "companyName": "ABC Manufacturing",
          "aboutUs": "We are a leading manufacturer...",
          "interestTags": ["textile", "automotive"]
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalProducers": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🛠️ Sistem Endpoints

### GET `/health`

**Sistem Sağlık Kontrolü**

**Response:**

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## 📊 İstatistik Endpoints

### GET `/stats/overview`

**Genel İstatistikler**
**Headers:** `Authorization: Bearer <token>`
**Required Role:** `admin` veya `superadmin`

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalProducers": 75,
    "totalAdmins": 5,
    "newUsersThisMonth": 25,
    "activeUsers": 120
  }
}
```

---

## 🔒 Güvenlik ve Hata Kodları

### HTTP Status Codes

- `200` - Başarılı
- `201` - Oluşturuldu
- `400` - Hatalı İstek
- `401` - Yetkisiz Erişim
- `403` - Yasaklı Erişim
- `404` - Bulunamadı
- `500` - Sunucu Hatası

### Hata Response Formatı

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "details": {
    "field": "error details"
  }
}
```

### Yaygın Hata Kodları

- `INVALID_CREDENTIALS` - Geçersiz kimlik bilgileri
- `USER_NOT_FOUND` - Kullanıcı bulunamadı
- `UNAUTHORIZED` - Yetkisiz erişim
- `FORBIDDEN` - Yasaklı erişim
- `VALIDATION_ERROR` - Doğrulama hatası
- `DUPLICATE_EMAIL` - E-posta zaten kullanımda

---

## 📝 Notlar

1. **Authentication**: Tüm korumalı endpoint'ler için `Authorization: Bearer <token>` header'ı gereklidir
2. **Role-Based Access**: Bazı endpoint'ler belirli roller gerektirir
3. **Pagination**: Liste endpoint'leri sayfalama destekler
4. **File Upload**: Video yükleme için `multipart/form-data` kullanılır
5. **Validation**: Tüm giriş verileri sunucu tarafında doğrulanır

---

## 🔄 Güncelleme Geçmişi

- **2024-01-01**: İlk versiyon oluşturuldu
- **2024-01-01**: Authentication endpoint'leri eklendi
- **2024-01-01**: Producer endpoint'leri eklendi
- **2024-01-01**: Admin endpoint'leri eklendi
- **2024-01-01**: Sistem taraması tamamlandı, uyumsuzluklar düzeltildi
- **2024-01-01**: Admin dashboard sayfası eklendi
- **2024-01-01**: İstatistik endpoint'i eklendi
- **2024-01-01**: User model'ine lastLoginAt alanı eklendi

---

_Bu dokümantasyon her yeni endpoint eklendiğinde güncellenir._
