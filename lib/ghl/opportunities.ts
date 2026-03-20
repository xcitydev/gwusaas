import { ghlFetch } from "./client";

export interface GHLOpportunity {
  id: string;
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  monetaryValue?: number;
  status: "open" | "won" | "lost" | "abandoned";
  assignedTo?: string;
}

export interface CreateOpportunityInput {
  name: string;
  pipelineId: string;
  pipelineStageId: string;
  contactId: string;
  locationId: string;
  monetaryValue?: number;
}

type OpportunitiesApiResponse = {
  opportunities?: GHLOpportunity[];
};

type OpportunityApiResponse = {
  opportunity?: GHLOpportunity;
};

/**
 * Fetches opportunities for a location, optionally filtered by pipeline.
 */
export async function getOpportunities(
  locationId: string,
  pipelineId?: string,
): Promise<GHLOpportunity[]> {
  try {
    const params = new URLSearchParams({ locationId });
    if (pipelineId) {
      params.set("pipelineId", pipelineId);
    }
    const result = await ghlFetch<OpportunitiesApiResponse>({
      endpoint: `/opportunities/?${params.toString()}`,
      method: "GET",
    });
    return result.opportunities ?? [];
  } catch (error) {
    console.error("getOpportunities failed", { locationId, pipelineId, error });
    return [];
  }
}

/**
 * Creates a new opportunity in GoHighLevel.
 */
export async function createOpportunity(
  data: CreateOpportunityInput,
): Promise<GHLOpportunity | null> {
  try {
    const result = await ghlFetch<OpportunityApiResponse>({
      endpoint: "/opportunities/",
      method: "POST",
      body: data,
    });
    return result.opportunity ?? null;
  } catch (error) {
    console.error("createOpportunity failed", { data, error });
    return null;
  }
}

/**
 * Moves an opportunity to a different pipeline stage.
 */
export async function updateOpportunityStage(
  opportunityId: string,
  stageId: string,
): Promise<GHLOpportunity | null> {
  try {
    const result = await ghlFetch<OpportunityApiResponse>({
      endpoint: `/opportunities/${opportunityId}`,
      method: "PUT",
      body: { pipelineStageId: stageId },
    });
    return result.opportunity ?? null;
  } catch (error) {
    console.error("updateOpportunityStage failed", { opportunityId, stageId, error });
    return null;
  }
}

/**
 * Deletes an opportunity.
 */
export async function deleteOpportunity(opportunityId: string): Promise<boolean> {
  try {
    await ghlFetch<unknown>({
      endpoint: `/opportunities/${opportunityId}`,
      method: "DELETE",
    });
    return true;
  } catch (error) {
    console.error("deleteOpportunity failed", { opportunityId, error });
    return false;
  }
}
