import { JobProviderListing } from "@/application/dto/job-provider.dto";
import { JobProvider } from "@/application/ports/job-provider.port";

export class FakeJobProvider implements JobProvider {
  constructor(
    public readonly name: string,
    private readonly listings: JobProviderListing[],
  ) {}

  async search(): Promise<JobProviderListing[]> {
    return this.listings;
  }
}
