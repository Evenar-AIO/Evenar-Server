# Git Branching Convention

## Main branches
- **main**: code production, chỉ merge từ `dev`, không commit trực tiếp
- **dev**: code đang phát triển, tích hợp các feature đã hoàn thành

## Working branches
Tạo từ `dev`, đặt tên theo format:

- **feature/**`ten-tinh-nang`  
  Ví dụ: `feature/login-form`
- **bugfix/**`mo-ta-loi`  
  Ví dụ: `bugfix/fix-header-overflow`
- **hotfix/**`mo-ta-nhanh` (fix gấp trên main)  
  Ví dụ: `hotfix/fix-build-prod`

## Rules
- Luôn tạo **Pull Request** để merge
- Không commit trực tiếp vào `main`, `dev`
- PR phải pass **lint + build check**
