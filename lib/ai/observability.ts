import "server-only";

import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type GenerationTelemetry = {
  requestId: string | null;
  chainId: string | null;
  modelId: string | null;
  stepIds: Record<"describe-image" | "write-captions", string | null>;
};

const disabledTelemetry: GenerationTelemetry = {
  requestId: null,
  chainId: null,
  modelId: null,
  stepIds: { "describe-image": null, "write-captions": null },
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : "Unknown generation error.";
}

export async function startGenerationTelemetry(
  supabase: Supabase,
  input: {
    userId: string;
    imageId: string;
    modelKey: string;
    metadata: Record<string, string | number>;
  },
): Promise<GenerationTelemetry> {
  try {
    const { data: mix, error: mixError } = await supabase
      .from("prompt_chain_mix")
      .select("prompt_chain_id")
      .eq("enabled", true)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (mixError || !mix?.prompt_chain_id) return disabledTelemetry;

    const [stepsResult, modelResult] = await Promise.all([
      supabase
        .from("prompt_chain_steps")
        .select("id, step_key")
        .eq("prompt_chain_id", mix.prompt_chain_id)
        .eq("enabled", true),
      supabase.from("llm_models").select("id").eq("model_key", input.modelKey).eq("enabled", true).limit(1).maybeSingle(),
    ]);

    const stepIds = { "describe-image": null, "write-captions": null } as GenerationTelemetry["stepIds"];
    for (const step of stepsResult.data ?? []) {
      const stepKey = String(step.step_key);
      if (stepKey === "describe-image" || stepKey === "write-captions") {
        stepIds[stepKey] = step.id;
      }
    }

    const { data: request, error: requestError } = await supabase
      .from("generation_requests")
      .insert({
        user_id: input.userId,
        image_id: input.imageId,
        prompt_chain_id: mix.prompt_chain_id,
        status: "processing",
        input_metadata: input.metadata,
      })
      .select("id")
      .single();
    if (requestError || !request) return disabledTelemetry;

    return {
      requestId: request.id,
      chainId: mix.prompt_chain_id,
      modelId: modelResult.data?.id ?? null,
      stepIds,
    };
  } catch {
    return disabledTelemetry;
  }
}

export async function recordLlmResponse(
  supabase: Supabase,
  telemetry: GenerationTelemetry,
  input: {
    step: "describe-image" | "write-captions";
    status: "succeeded" | "failed";
    inputSnapshot: Record<string, unknown>;
    outputText?: string;
    outputJson?: Record<string, unknown>;
    latencyMs: number;
    error?: unknown;
  },
) {
  if (!telemetry.requestId) return;
  try {
    await supabase.from("llm_responses").insert({
      generation_request_id: telemetry.requestId,
      prompt_chain_step_id: telemetry.stepIds[input.step],
      llm_model_id: telemetry.modelId,
      status: input.status,
      input_snapshot: input.inputSnapshot,
      output_text: input.outputText ?? null,
      output_json: input.outputJson ?? null,
      latency_ms: input.latencyMs,
      error_message: input.error ? errorText(input.error) : null,
    });
  } catch {
    // Observability must never block the user-facing generation flow.
  }
}

export async function finishGenerationTelemetry(
  supabase: Supabase,
  telemetry: GenerationTelemetry,
  input: { status: "succeeded" | "failed"; startedAt: number; error?: unknown },
) {
  if (!telemetry.requestId) return;
  try {
    await supabase
      .from("generation_requests")
      .update({
        status: input.status,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - input.startedAt,
        error_message: input.error ? errorText(input.error) : null,
      })
      .eq("id", telemetry.requestId);
  } catch {
    // The generated result remains valid even if telemetry cannot be finalized.
  }
}
