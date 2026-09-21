import os

import pytest

from metering_sdk import MeteringClient, MeteringError


def test_client_requires_sec_key():
    with pytest.raises(ValueError):
        MeteringClient(api_key="")


def test_client_rejects_public_key():
    with pytest.raises(ValueError):
        MeteringClient(api_key="pk_test_123")
