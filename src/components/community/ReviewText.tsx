'use client';
import { useState } from 'react';

/* A review, with spoilers hidden until the reader asks. */
export default function ReviewText({ text, spoiler }: { text: string; spoiler: boolean }) {
  const [shown, setShown] = useState(!spoiler);
  if (!shown) return <p className="type-body vm-muted">This review has spoilers. <button type="button" className="fd-link" onClick={() => setShown(true)}>Show it</button></p>;
  return <blockquote className="review-text type-body">{text}</blockquote>;
}
