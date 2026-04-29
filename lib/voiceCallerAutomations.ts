import type { CallLog } from "@/types/voiceCaller";

type AutomationResult = {
  name: string;
  fired: boolean;
  skipped?: boolean;
  error?: string;
};

function findBookedTime(callLog: CallLog): string | undefined {
  const bookedLine = callLog.transcript.find(
    (line) => line.signal === "BOOKED" && line.role === "agent",
  );
  if (bookedLine) return bookedLine.text;
  const thursdayMention = callLog.transcript.find((line) =>
    /thursday\s*2|friday\s*10/i.test(line.text),
  );
  return thursdayMention?.text;
}

async function fireSlackAlert(callLog: CallLog, bookedTime?: string): Promise<AutomationResult> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return { name: "slack", fired: false, skipped: true };
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: [
          `✦ *Qualified Lead* — ${callLog.leadName} · ${callLog.leadPhone}`,
          `📊 Score: ${callLog.qualScore}/4 signals`,
          bookedTime ? `📅 Next: ${bookedTime}` : null,
          callLog.summary ? `📝 ${callLog.summary}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`);
    return { name: "slack", fired: true };
  } catch (error) {
    return {
      name: "slack",
      fired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fireManychatDm(callLog: CallLog): Promise<AutomationResult> {
  const apiKey = process.env.MANYCHAT_API_KEY;
  if (!apiKey) return { name: "manychat", fired: false, skipped: true };
  try {
    const res = await fetch("https://api.manychat.com/fb/sending/sendContent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: callLog.leadPhone,
        data: {
          version: "v2",
          content: {
            messages: [
              {
                type: "text",
                text: `Hey ${callLog.leadName.split(" ")[0]}, great chat! Sending over the demo link shortly.`,
              },
            ],
          },
        },
        message_tag: "ACCOUNT_UPDATE",
        tags: ["voice_qualified"],
      }),
    });
    if (!res.ok) throw new Error(`Manychat returned ${res.status}`);
    return { name: "manychat", fired: true };
  } catch (error) {
    return {
      name: "manychat",
      fired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fireResendEmail(
  callLog: CallLog,
  leadEmail: string | undefined,
  bookedTime?: string,
): Promise<AutomationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { name: "resend", fired: false, skipped: true };
  if (!leadEmail) return { name: "resend", fired: false, skipped: true, error: "no email on lead" };

  const firstName = callLog.leadName.split(" ")[0] || "there";
  const from = process.env.RESEND_FROM_EMAIL || "Jordan <jordan@agency.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: leadEmail,
        subject: `Great talking, ${firstName} — here's your demo link`,
        html: [
          `<p>Hey ${firstName},</p>`,
          `<p>Great chatting just now. As promised, here's the demo link:</p>`,
          `<p><a href="${process.env.CAL_LINK || "https://cal.com/demo"}">Pick a time that works</a></p>`,
          bookedTime ? `<p>We tentatively lined up: <strong>${bookedTime}</strong>.</p>` : "",
          `<p>— Jordan</p>`,
        ].join(""),
      }),
    });
    if (!res.ok) throw new Error(`Resend returned ${res.status}`);
    return { name: "resend", fired: true };
  } catch (error) {
    return {
      name: "resend",
      fired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fireGhlPipelineUpdate(callLog: CallLog): Promise<AutomationResult> {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  const qualifiedStageId = process.env.GHL_QUALIFIED_STAGE_ID;
  if (!apiKey || !locationId || !qualifiedStageId) {
    return { name: "ghl", fired: false, skipped: true };
  }
  try {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?locationId=${locationId}&query=${encodeURIComponent(callLog.leadPhone)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      },
    );
    if (!searchRes.ok) throw new Error(`GHL contact search failed (${searchRes.status})`);
    const contactPayload = (await searchRes.json()) as {
      contacts?: Array<{ id?: string }>;
    };
    const contactId = contactPayload.contacts?.[0]?.id;
    if (!contactId) {
      return { name: "ghl", fired: false, error: "Contact not found in GHL" };
    }

    const updateRes = await fetch(
      `https://services.leadconnectorhq.com/opportunities/?locationId=${locationId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId,
          pipelineStageId: qualifiedStageId,
          status: "open",
          name: `Qualified: ${callLog.leadName}`,
        }),
      },
    );
    if (!updateRes.ok) throw new Error(`GHL opportunity update failed (${updateRes.status})`);
    return { name: "ghl", fired: true };
  } catch (error) {
    return {
      name: "ghl",
      fired: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run the 4 external automations in parallel. Convex logging is handled by the
 * stream handler directly, so it's not included here.
 *
 * Pass `leadEmail` separately since CallLog doesn't carry it (it lives on the
 * Campaign `leads` array).
 */
export async function triggerPostCallAutomations(
  callLog: CallLog,
  leadEmail?: string,
): Promise<AutomationResult[]> {
  if (callLog.outcome !== "qualified") return [];

  const bookedTime = findBookedTime(callLog);

  return Promise.all([
    fireSlackAlert(callLog, bookedTime),
    fireManychatDm(callLog),
    fireResendEmail(callLog, leadEmail, bookedTime),
    fireGhlPipelineUpdate(callLog),
  ]);
}
