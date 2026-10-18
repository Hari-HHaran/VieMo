import { redirect } from 'next/navigation';

/* My Cinema Library now lives on Profile, as its Library tab. Old links land there. */
export default function Library() {
  redirect('/profile?tab=library');
}
