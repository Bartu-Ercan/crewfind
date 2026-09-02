import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("ads.txt", () => {
  const previousPublisher = process.env.ADSENSE_PUBLISHER_ID;

  beforeEach(() => {
    delete process.env.ADSENSE_PUBLISHER_ID;
  });

  afterAll(() => {
    process.env.ADSENSE_PUBLISHER_ID = previousPublisher;
  });

  it("stays unavailable until a valid publisher is configured", async () => {
    const response = GET();

    expect(response.status).toBe(404);
  });

  it("publishes only the configured direct Google seller", async () => {
    process.env.ADSENSE_PUBLISHER_ID = "pub-1234567890123456";
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });
});
