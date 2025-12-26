class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "APP_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.is_operational = True


def create_error_response(code: str, message: str, details=None) -> dict:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details,
        },
    }
