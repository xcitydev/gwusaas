import { ghlFetch } from "./client";

export interface GHLStage {
  id: string;
  name: string;
  position: number;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages: GHLStage[];
}

type PipelinesApiResponse = {
  pipelines?: GHLPipeline[];
};

type PipelineApiResponse = {
  pipeline?: GHLPipeline;
};

/**
 * Fetches all pipelines for a GoHighLevel location.
 */
export async function getPipelines(locationId: string): Promise<GHLPipeline[]> {
  try {
    const params = new URLSearchParams({ locationId });
    const result = await ghlFetch<PipelinesApiResponse>({
      endpoint: `/opportunities/pipelines?${params.toString()}`,
      method: "GET",
    });
    return result.pipelines ?? [];
  } catch (error) {
    console.error("getPipelines failed", { locationId, error });
    return [];
  }
}

/**
 * Fetches a single pipeline and its stages.
 */
export async function getPipelineById(
  pipelineId: string,
  locationId: string,
): Promise<GHLPipeline | null> {
  try {
    const params = new URLSearchParams({ locationId });
    const result = await ghlFetch<PipelineApiResponse>({
      endpoint: `/opportunities/pipelines/${pipelineId}?${params.toString()}`,
      method: "GET",
    });
    return result.pipeline ?? null;
  } catch (error) {
    console.error("getPipelineById failed", { pipelineId, locationId, error });
    return null;
  }
}
