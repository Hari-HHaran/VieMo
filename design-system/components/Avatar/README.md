# Avatar

A round portrait for a person, falling back to their initials on `surface-overlay` when there is no photo or it fails to load.

**Provide:** `name` (always; it drives the initials) and `src` when the person uploaded a photo. Sizes: `xs` 20px beside a byline, `sm` 32px (`avatar-sm`) in feeds, `md` 40px in rows, `lg` 72px (`avatar-lg`) on a profile.

- It is decorative by default because the name is printed next to it. Set `decorative={false}` only when it stands alone.
- Never generate or fetch a placeholder face. Initials are the honest fallback.
