import { JobProviderListing } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";

export class FakeJobProvider implements JobProvider {
  constructor(
    public readonly name: string,
    private readonly listings: JobProviderListing[],
    private readonly error?: Error,
  ) {}

  async search(): Promise<JobProviderListing[]> {
    if (this.error) throw this.error;
    return this.listings;
  }
}
