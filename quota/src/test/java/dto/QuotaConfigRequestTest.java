package dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class QuotaConfigRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {

        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private QuotaConfigRequest valid() {
        return new QuotaConfigRequest(
                "PRO",
                10000,
                true,
                80,
                new BigDecimal("0.005000"));
    }

    @Test
    void validRequestPasses() {
        assertThat(validator.validate(valid())).isEmpty();
    }

    @Test
    void blankTierNameRejected() {
        assertThat(validator.validate(
                new QuotaConfigRequest(
                        "", 10000, true, 80, new BigDecimal("0.005000"))))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("tierName"));
    }

    @Test
    void zeroMonthlyLimitRejected() {
        assertThat(validator.validate(
                new QuotaConfigRequest(
                        "PRO", 0, true, 80, new BigDecimal("0.005000"))))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("monthlyUnitLimit"));
    }

    @Test
    void thresholdAboveRangeRejected() {
        assertThat(validator.validate(
                new QuotaConfigRequest(
                        "PRO", 10000, true, 101, new BigDecimal("0.005000"))))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("alertThresholdPercent"));
    }

    @Test
    void thresholdBelowRangeRejected() {
        assertThat(validator.validate(
                new QuotaConfigRequest(
                        "PRO", 10000, true, 0, new BigDecimal("0.005000"))))
                .anySatisfy(violation ->
                        assertThat(violation.getPropertyPath().toString())
                                .isEqualTo("alertThresholdPercent"));
    }
}