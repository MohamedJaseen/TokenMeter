package exception;

public class ApiError {

    private final int status;
    private final String error;

    public ApiError(int status, String error) {
        this.status = status;
        this.error = error;
    }

    public int getStatus() {
        return status;
    }

    public String getError() {
        return error;
    }
}