/** Every string the account page shows, so wording is reviewed in one place (UX-12). */
export const ACCOUNT_COPY = {
  title: "Account",
  profile: {
    title: "Profile",
  },
  devices: {
    title: "Signed-in devices",
    body: "Each browser or extension signed in to your account. Signing one out ends its session at once.",
    unknown: "Unknown device",
    current: "This device",
    signedIn: "Signed in {created}, expires {expires}",
    signOut: "Sign out",
    signOutLabel: "Sign out {device}",
    signingOut: "Signing out…",
    none: "No other devices are signed in.",
  },
  export: {
    title: "Export your data",
    body: "Download your profile, entries, streaming links, lists and list items as one JSON file. Passwords and sign-in tokens are never included.",
    action: "Download JSON export",
  },
  erase: {
    title: "Delete account",
    body: "Permanently deletes your account, every entry, list and list item, and signs out every device. This cannot be undone and nothing is kept for restore. Export your data first if you want a copy.",
    label: "Type {email} to confirm",
    submit: "Delete account and all data",
    pending: "Deleting…",
  },
};
