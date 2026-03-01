## 📋 Phân chia công việc – Nhóm 5 người

Tổng cộng: **31 API endpoints**, chia đều mỗi người **~6 APIs**, kèm theo trang frontend tương ứng.

---

### 👤 Hưng – Authentication & Security
> **Module**: Xác thực, bảo mật, phiên đăng nhập
> **Collections liên quan**: `users`

| # | API Endpoint | Method | Role sử dụng |
|---|---|---|---|
| 1 | `/signup-option` | POST | Guest |
| 2 | `/register` | POST | Guest |
| 3 | `/verify` | POST | Guest |
| 4 | `/login` | POST | Guest |
| 5 | `/login-google` | GET | Guest |
| 6 | `/logout` | POST | Customer / EventOwner / Admin |
| 7 | `/forgot-password` | POST | Guest |
| 8 | `/send-reset-otp` | POST | Guest |
| 9 | `/reset-password` | POST | Guest |
| 10 | `/change-password` | POST | Customer / EventOwner / Admin |

**Trang frontend cần làm:**
- Trang Đăng ký (chọn role, form đăng ký, xác thực OTP)
- Trang Đăng nhập (email/password + Google OAuth)
- Trang Quên mật khẩu / Reset mật khẩu
- Trang Đổi mật khẩu

> **Ghi chú**: Người này có 10 API nhưng phần lớn là các endpoints nhỏ, logic đơn giản (validate input → gửi OTP → kiểm tra OTP), và các trang frontend đi kèm cũng đơn giản (form-based). Khối lượng tương đương các thành viên khác.

---

### 👤 Vy – User Profile & Event Management
> **Module**: Quản lý hồ sơ người dùng + Quản lý sự kiện
> **Collections liên quan**: `users`, `events`, `genres`, `zones`, `seats`, `ticketinfos`, `ticketinventories`

| # | API Endpoint | Method | Role sử dụng |
|---|---|---|---|
| 1 | `/profile/update` | POST | Customer |
| 2 | `/owner/profile/update` | POST | EventOwner |
| 3 | `/events` | POST | EventOwner |
| 4 | `/events/{id}` | PUT | EventOwner |
| 5 | `/events/{id}` | DELETE | EventOwner / Admin |
| 6 | `/events` | GET | Guest / Customer / EventOwner / Admin |

**Trang frontend cần làm:**
- Trang Hồ sơ cá nhân (Customer & EventOwner)
- Trang Tạo sự kiện (form tạo + upload ảnh + cấu hình vé)
- Trang Chỉnh sửa sự kiện
- Trang Danh sách sự kiện của EventOwner (quản lý)

---

### 👤 Đạt – Event Discovery & Booking/Payment
> **Module**: Tìm kiếm sự kiện + Đặt vé & Thanh toán
> **Collections liên quan**: `events`, `tickets`, `ticketinventories`, `orders`, `orderitems`, `paymentmethods`, `promotions`

| # | API Endpoint | Method | Role sử dụng |
|---|---|---|---|
| 1 | `/events/search` | GET | Guest / Customer |
| 2 | `/cart` | POST | Customer |
| 3 | `/bookings` | POST | Customer |
| 4 | `/payments` | POST | Customer |
| 5 | `/orders` | GET | Customer |
| 6 | `/refunds/request` | POST | Customer |

**Trang frontend cần làm:**
- Trang Tìm kiếm sự kiện (search bar, filter, kết quả)
- Trang Chi tiết sự kiện (xem thông tin + chọn vé)
- Trang Giỏ hàng
- Trang Thanh toán (tích hợp PayOS/VNPay)
- Trang Lịch sử đơn hàng
- Trang Yêu cầu hoàn tiền

---

### 👤 Hạt – Admin Panel
> **Module**: Quản trị hệ thống (Users, Events, Transactions, Reports)
> **Collections liên quan**: `users`, `events`, `orders`, `refunds`, `auditlogs`

| # | API Endpoint | Method | Role sử dụng |
|---|---|---|---|
| 1 | `/admin/users` | GET | Admin |
| 2 | `/admin/users/{id}/lock` | POST | Admin |
| 3 | `/admin/users/{id}/unlock` | POST | Admin |
| 4 | `/admin/users/{id}` | DELETE | Admin |
| 5 | `/admin/events/{id}/approve` | POST | Admin |
| 6 | `/refunds/process` | POST | Admin |
| 7 | `/admin/transactions` | GET | Admin |
| 8 | `/admin/audit-logs` | GET | Admin |
| 9 | `/admin/stats/export` | GET | Admin |
| 10 | `/admin/dashboard` | GET | Admin |

**Trang frontend cần làm:**
- Trang Dashboard Admin (biểu đồ doanh thu, thống kê)
- Trang Quản lý người dùng (danh sách, khóa/mở/xóa)
- Trang Phê duyệt sự kiện
- Trang Quản lý hoàn tiền
- Trang Lịch sử giao dịch
- Trang Audit logs
- Trang Xuất báo cáo

> **Ghi chú**: Người này có 10 API nhưng hầu hết là CRUD đơn giản (GET list, POST toggle). Tuy nhiên trang frontend (Dashboard + biểu đồ) sẽ phức tạp hơn, nên tổng khối lượng cân bằng.

---

### 👤 Nguyệt – Support, Chat & Feedback
> **Module**: Chat real-time, Phản hồi, Hỗ trợ & Thông báo
> **Collections liên quan**: `conversations`, `messages`, `fileattachments`, `feedbacks`, `reports`, `supportitems`, `supportattachments`, `notifications`

| # | API Endpoint | Method | Role sử dụng |
|---|---|---|---|
| 1 | `/chat/send` | POST (+ WebSocket) | Customer / EventOwner |
| 2 | `/feedback` | POST | Customer |
| 3 | `/support/submit` | POST | Customer / EventOwner |

**Trang frontend cần làm:**
- Trang Chat real-time (WebSocket, danh sách hội thoại, gửi tin nhắn + file đính kèm)
- Trang Đánh giá / Phản hồi sự kiện
- Trang Gửi yêu cầu hỗ trợ (Support Center)
- Trang Thông báo (Notification Center)

> **Ghi chú**: Người này chỉ có 3 API trong tài liệu, nhưng thực tế cần **bổ sung thêm các API ngầm** để hoàn thiện module (tất cả đều nằm trong scope của người này):

| # | API bổ sung (cần thiết) | Method | Role |
|---|---|---|---|
| 4 | `/chat/conversations` (danh sách hội thoại) | GET | Customer / EventOwner |
| 5 | `/chat/conversations/{id}/messages` (lịch sử tin nhắn) | GET | Customer / EventOwner |
| 6 | `/feedback/{eventId}` (danh sách feedback của event) | GET | Guest / Customer / EventOwner |
| 7 | `/support/list` (danh sách ticket hỗ trợ) | GET | Customer / EventOwner / Admin |
| 8 | `/notifications` (danh sách thông báo) | GET | Customer / EventOwner / Admin |
| 9 | WebSocket setup cho real-time chat | — | Customer / EventOwner |

> Với WebSocket + real-time + nhiều collection liên quan, khối lượng công việc **tương đương** các thành viên khác.

---

## 📊 Tóm tắt phân bổ

| Thành viên | Module chính | Số API (doc) | Số API thực tế | Độ phức tạp FE |
|---|---|---|---|---|
| **1** | Auth & Security | 10 | 10 | ⭐⭐ (form đơn giản) |
| **2** | Profile & Event CRUD | 6 | 6 | ⭐⭐⭐ (form phức tạp, upload) |
| **3** | Search & Booking/Payment | 6 | 6 | ⭐⭐⭐⭐ (tích hợp thanh toán) |
| **4** | Admin Panel | 10 | 10 | ⭐⭐⭐ (dashboard, biểu đồ) |
| **5** | Chat, Feedback, Support | 3 | ~9 | ⭐⭐⭐⭐ (WebSocket real-time) |

Khối lượng được cân bằng bằng cách **bù trừ giữa số lượng API và độ phức tạp frontend**. Thành viên có ít API hơn sẽ có frontend phức tạp hơn và ngược lại.

### User Input

priority cho từng api, deadline phải xong trong 2 tuần

### Planner Response

## 📅 Sprint Plan – 2 tuần (02/03 → 15/03/2026)

> **Quy ước Priority:**
> - 🔴 **P0** – Critical / Blocking (các module khác phụ thuộc, làm trước)
> - 🟠 **P1** – High (chức năng chính, cần hoàn thành trong tuần 1-2)
> - 🟡 **P2** – Medium (bổ trợ, hoàn thiện cuối sprint)

---

### 👤 Hưng 1 – Authentication & Security

> ⚠️ **Đây là module BLOCKING** – tất cả thành viên khác đều cần Auth hoạt động trước.

| # | API | Priority | Deadline | Lý do |
|---|---|---|---|---|
| 1 | `POST /login` | 🔴 P0 | T2 02/03 | Mọi API cần token, blocking toàn bộ team |
| 2 | `POST /register` | 🔴 P0 | T3 03/03 | Cần tạo user để test các module khác |
| 3 | `POST /verify` | 🔴 P0 | T3 03/03 | Gắn liền register, kích hoạt tài khoản |
| 4 | `POST /signup-option` | 🔴 P0 | T3 03/03 | Role routing cho register |
| 5 | `POST /logout` | 🟠 P1 | T5 05/03 | Session management |
| 6 | `GET /login-google` | 🟠 P1 | T6 06/03 | OAuth tích hợp bên thứ 3 |
| 7 | `POST /forgot-password` | 🟡 P2 | T2 09/03 | Không blocking |
| 8 | `POST /send-reset-otp` | 🟡 P2 | T2 09/03 | Đi kèm forgot-password |
| 9 | `POST /reset-password` | 🟡 P2 | T3 10/03 | Đi kèm forgot-password |
| 10 | `POST /change-password` | 🟡 P2 | T3 10/03 | Không blocking |

> 📌 **FE Auth**: Form Login + Register → xong T4 04/03 | Google Login → T6 06/03 | Quên/Đổi MK → T4 11/03

---

### 👤 Vy 2 – User Profile & Event Management

| # | API | Priority | Deadline | Lý do |
|---|---|---|---|---|
| 1 | `GET /events` | 🔴 P0 | T3 03/03 | Homepage cần danh sách sự kiện, blocking TTV3 (search) |
| 2 | `POST /events` | 🔴 P0 | T4 04/03 | EventOwner cần tạo event để hệ thống có data test |
| 3 | `PUT /events/{id}` | 🟠 P1 | T6 06/03 | Chỉnh sửa event |
| 4 | `DELETE /events/{id}` | 🟠 P1 | T6 06/03 | Xóa event (soft delete) |
| 5 | `POST /profile/update` | 🟡 P2 | T3 10/03 | Không blocking |
| 6 | `POST /owner/profile/update` | 🟡 P2 | T4 11/03 | Không blocking |

> 📌 **FE Event**: Trang danh sách event → T4 04/03 | Form tạo/sửa event → T7 07/03 | Profile → T5 12/03

---

### 👤  Đạt 3 – Event Discovery & Booking/Payment

> ⚠️ **Phụ thuộc**: Cần TTV1 (Auth) xong Login + TTV2 xong `GET /events` trước khi bắt đầu

| # | API | Priority | Deadline | Lý do |
|---|---|---|---|---|
| 1 | `GET /events/search` | 🔴 P0 | T4 04/03 | Core feature, khách tìm sự kiện |
| 2 | `POST /cart` | 🔴 P0 | T5 05/03 | Bước đầu tiên của luồng mua vé |
| 3 | `POST /bookings` | 🔴 P0 | T6 06/03 | Tạo đơn đặt vé |
| 4 | `POST /payments` | 🔴 P0 | T2 09/03 | Tích hợp cổng thanh toán, cần thời gian test |
| 5 | `GET /orders` | 🟠 P1 | T4 11/03 | Lịch sử đơn hàng |
| 6 | `POST /refunds/request` | 🟡 P2 | T5 12/03 | Yêu cầu hoàn tiền |

> 📌 **FE Booking**: Search → T5 05/03 | Chi tiết event + Giỏ hàng → T7 07/03 | Thanh toán → T3 10/03 | Lịch sử + Hoàn tiền → T6 13/03

---

### 👤 Hạt 4 – Admin Panel

> ⚠️ **Phụ thuộc**: Cần TTV1 (Auth) xong Login với role Admin

| # | API | Priority | Deadline | Lý do |
|---|---|---|---|---|
| 1 | `GET /admin/users` | 🔴 P0 | T3 03/03 | Admin cần quản lý user ngay |
| 2 | `POST /admin/users/{id}/lock` | 🔴 P0 | T4 04/03 | Business rule: Admin khóa user |
| 3 | `POST /admin/users/{id}/unlock` | 🔴 P0 | T4 04/03 | Đi kèm lock |
| 4 | `POST /admin/events/{id}/approve` | 🔴 P0 | T5 05/03 | Blocking: event phải approved mới hiển thị |
| 5 | `DELETE /admin/users/{id}` | 🟠 P1 | T6 06/03 | Soft delete user |
| 6 | `GET /admin/dashboard` | 🟠 P1 | T2 09/03 | Dashboard thống kê |
| 7 | `GET /admin/transactions` | 🟠 P1 | T3 10/03 | Xem giao dịch hệ thống |
| 8 | `POST /refunds/process` | 🟠 P1 | T4 11/03 | Phê duyệt hoàn tiền (cần TTV3 xong refunds/request) |
| 9 | `GET /admin/audit-logs` | 🟡 P2 | T5 12/03 | Audit trail |
| 10 | `GET /admin/stats/export` | 🟡 P2 | T6 13/03 | Xuất báo cáo |

> 📌 **FE Admin**: Quản lý user → T5 05/03 | Phê duyệt event → T6 06/03 | Dashboard → T3 10/03 | Transactions + Refund → T5 12/03 | Audit + Export → CN 14/03

---

### 👤 Nguyệt 5 – Support, Chat & Feedback

> ⚠️ **Phụ thuộc**: Cần TTV1 (Auth) xong Login. Chat/Feedback tương đối độc lập.

| # | API | Priority | Deadline | Lý do |
|---|---|---|---|---|
| 1 | `GET /chat/conversations` *(bổ sung)* | 🔴 P0 | T4 04/03 | Cần trước khi gửi tin nhắn |
| 2 | `POST /chat/send` + WebSocket setup | 🔴 P0 | T6 06/03 | Core real-time, phức tạp nhất |
| 3 | `GET /chat/conversations/{id}/messages` *(bổ sung)* | 🔴 P0 | T6 06/03 | Lịch sử chat |
| 4 | `POST /feedback` | 🟠 P1 | T2 09/03 | Gửi đánh giá event |
| 5 | `GET /feedback/{eventId}` *(bổ sung)* | 🟠 P1 | T2 09/03 | Hiển thị feedback |
| 6 | `POST /support/submit` | 🟠 P1 | T3 10/03 | Gửi yêu cầu hỗ trợ |
| 7 | `GET /support/list` *(bổ sung)* | 🟠 P1 | T4 11/03 | Danh sách ticket hỗ trợ |
| 8 | `GET /notifications` *(bổ sung)* | 🟡 P2 | T5 12/03 | Thông báo |

> 📌 **FE Chat**: Khung chat + WebSocket → T7 07/03 | Feedback → T3 10/03 | Support Center → T5 12/03 | Notifications → T6 13/03

---

## 📊 Timeline tổng quan

```
TUẦN 1 (02/03 – 08/03)                         TUẦN 2 (09/03 – 15/03)
T2   T3   T4   T5   T6   T7   CN    |    T2   T3   T4   T5   T6   T7   CN
──────────────────────────────────────|──────────────────────────────────────
TTV1: ██ Login ██ Register+OTP █ Logout █ Google │    █ Forgot/Reset PW █ Change PW │    ✅
TTV2: ░░░░░░░ █ GET events █ POST event █ PUT/DEL │    ░░░░░░░░ █ Profile update  │    ✅
TTV3: ░░░░░░░░░░░░░ █ Search █ Cart █ Book █ ░░░░ │ █ Payment ███ █ Orders █ Refund│    ✅
TTV4: ░░░░░░░ █ Users █ Lock █ Approve █ Delete   │ █ Dashboard █ Trans █ RefProc █│Exp ✅
TTV5: ░░░░░░░░░░░░░ █ Conversations █ Chat+WS ███ │ █ Feedback █ Support █ Notif   │    ✅
──────────────────────────────────────|──────────────────────────────────────
         🔴 P0 ZONE                  |         🟠 P1 + 🟡 P2 ZONE
```

---

## ⚡ Dependency Chain (thứ tự blocking)

```
TTV1: Login + Register ──┬──→ TTV2: GET/POST events ──→ TTV3: Search + Booking
                         ├──→ TTV4: Admin users + Approve event
                         └──→ TTV5: Chat conversations
```

> **Ngày 02/03 (T2)** là ngày quan trọng nhất – TTV1 phải ship `POST /login` để unblock toàn bộ team.

---

## 🏁 Milestone kiểm tra

| Ngày | Milestone | Ai cần xong? |
|---|---|---|
| **T3 03/03** | Login + Register + GET events hoạt động → team có thể test | TTV1, TTV2 |
| **T6 06/03** | Luồng chính hoạt động: Đăng ký → Đăng nhập → Xem event → Thêm giỏ hàng → Đặt vé | TTV1, TTV2, TTV3 |
| **T7 07/03** | Admin approve event + Chat real-time demo | TTV4, TTV5 |
| **T3 10/03** | Thanh toán tích hợp xong, Dashboard admin có data | TTV3, TTV4 |
| **CN 14/03** | **Toàn bộ API + FE hoàn thiện**, sẵn sàng test tổng thể | ALL |
| **CN 15/03** | **Buffer day** – Fix bug, polish UI, final testing | ALL |