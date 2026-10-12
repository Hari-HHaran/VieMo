import { Icon } from '@/ds/client';

export default function SearchField({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/search" method="get" role="search" className="search">
      <label htmlFor="q" className="vm-sr">Search films</label>
      <Icon name="search" size={20} className="search-icon" />
      <input id="q" name="q" type="search" defaultValue={defaultValue} placeholder="Search films" autoComplete="off" maxLength={100} className="search-input type-body" />
      <button type="submit" className="vm-btn vm-btn-primary vm-btn-md type-label">Search</button>
    </form>
  );
}
