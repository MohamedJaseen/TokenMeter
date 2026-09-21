package exception;

public record ApiError(
        int status,
        String error
) {
}