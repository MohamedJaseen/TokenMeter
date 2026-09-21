package dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QuotaUsageRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {

        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void validRequestPasses() {

        var request = new QuotaUsageRequest("tenantA", "llm_tokens", 1500);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void blankTenantIdRejected() {

        var request = new QuotaUsageRequest(" ", "llm_tokens", 1500);

        assertThat(validator.validate(request))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("tenantId"));
    }

    @Test
    void blankMetricNameRejected() {

        var request = new QuotaUsageRequest("tenantA", "", 1500);

        assertThat(validator.validate(request))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("metricName"));
    }

    @Test
    void zeroUnitsRejected() {

        var request = new QuotaUsageRequest("tenantA", "llm_tokens", 0);

        assertThat(validator.validate(request))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("units"));
    }

    @Test
    void negativeUnitsRejected() {

        var request = new QuotaUsageRequest("tenantA", "llm_tokens", -10);

        assertThat(validator.validate(request))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("units"));
    }
}