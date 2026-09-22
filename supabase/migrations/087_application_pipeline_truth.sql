-- 087_application_pipeline_truth.sql
--
-- Migration 084 backfilled one application + one participation per camper and
-- blanket-stamped them `approved` / `attended` / `member`. That erased the only
-- record of who was still waiting on a decision, so the People CRM's Applicant
-- filter came back almost empty while /admin/applicants still showed a queue.
--
-- The real state of those reviews lives on `user_profiles` (role = 'pending',
-- approved_at, denied_at). Replay it onto the application pipeline so both
-- screens agree.
--
-- Only rows created by the backfill are touched: every application is
-- source = 'import' with decided_by IS NULL, i.e. no human decision is
-- overwritten. `event_participants` is deliberately left alone — whether a
-- never-approved applicant physically showed up in 2026 is not something this
-- migration can know, and deleting attendance history is not reversible.

begin;

-- Accounts explicitly turned down: the application was denied, not approved.
with denied as (
  select up.person_id, up.denied_at, up.denied_reason
  from public.user_profiles up
  where up.person_id is not null
    and up.denied_at is not null
)
update public.event_applications ea
set status = 'denied',
    decided_at = denied.denied_at,
    decision_note = coalesce(ea.decision_note, denied.denied_reason)
from denied
where ea.person_id = denied.person_id
  and ea.source = 'import'
  and ea.decided_by is null;

-- Accounts still sitting in the review queue: the application is still open.
with awaiting as (
  select up.person_id
  from public.user_profiles up
  where up.person_id is not null
    and up.role = 'pending'
    and up.denied_at is null
)
update public.event_applications ea
set status = 'submitted',
    submitted_at = coalesce(ea.submitted_at, ea.created_at),
    decided_at = null,
    decided_by = null
from awaiting
where ea.person_id = awaiting.person_id
  and ea.source = 'import'
  and ea.decided_by is null;

-- Re-derive person status from the corrected pipeline. An application still
-- awaiting a decision outranks everything else; a denial parks the person as
-- inactive; anything approved is a member. `blocked` is an explicit admin
-- judgement and is never recomputed.
update public.people p
set status = derived.status::public.person_status
from (
  select
    p.id,
    case
      when exists (
        select 1 from public.event_applications ea
        where ea.person_id = p.id
          and ea.status in ('draft', 'submitted', 'under_review', 'waitlisted')
      ) then 'applicant'
      when exists (
        select 1 from public.user_profiles up
        where up.person_id = p.id and up.denied_at is not null
      ) then 'inactive'
      when exists (
        select 1 from public.user_profiles up
        where up.person_id = p.id and up.role = 'pending'
      ) then 'applicant'
      when exists (
        select 1 from public.event_applications ea
        where ea.person_id = p.id and ea.status = 'approved'
      ) then 'member'
      else p.status::text
    end as status
  from public.people p
  where p.status <> 'blocked'
) as derived
where p.id = derived.id
  and p.status::text is distinct from derived.status;

commit;
