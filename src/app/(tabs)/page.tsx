import { Icon, Poster } from '@/ds/client';
import DragRail from '@/components/fx/DragRail';
import TiltCard from '@/components/fx/TiltCard';
import BoothHero from '@/components/home/BoothHero';
import YourNight from '@/components/home/YourNight';
import Problem from '@/components/Problem';
import SaveToggle from '@/components/SaveToggle';
import Ticker from '@/components/Ticker';
import { regionName, viewerRegion } from '@/lib/region';
import { settle } from '@/lib/settle';
import { asOf, genres, HIDDEN_GEMS_RULE, hiddenGems, img, nowPlaying, posterSet, trending, yearOf, type MovieSummary } from '@/lib/tmdb';

/* Rendered per request; TMDB responses themselves are cached (see lib/tmdb.ts). */
export const dynamic = 'force-dynamic';

const today = () => new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Singapore' });
const saveable = (m: MovieSummary) => ({ id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path });

/* Home is the Projection Booth lobby: this week's most-watched film lit by your pointer, then the programme
   set like an editorial spread, rails you can fling, and the circle (empty until accounts exist, and says so). */
export default async function Home() {
  const region = await viewerRegion();
  const [trend, genreList, cinemas, gems] = await Promise.all([
    settle(trending(), 'trending films'), settle(genres(), 'genres'), settle(nowPlaying(region), 'cinema listings'), settle(hiddenGems(), 'hidden gems'),
  ]);
  const names = new Map((genreList.ok ? genreList.value : []).map((g) => [g.id, g.name]));
  const genreLine = (m: MovieSummary, n = 2) => (m.genre_ids ?? []).map((g) => names.get(g)).filter(Boolean).slice(0, n).join(', ');
  const films = trend.ok ? trend.value.filter((m) => m.poster_path) : [];
  const lead = films.find((m) => m.backdrop_path) ?? films[0];
  const rest = films.filter((m) => m !== lead);
  const feature = rest.find((m) => m.backdrop_path);
  const pair = rest.filter((m) => m !== feature).slice(0, 2);
  const listed = rest.filter((m) => m !== feature && !pair.includes(m)).slice(0, 4);
  const rank = (m: MovieSummary) => films.indexOf(m) + 1;
  const place = regionName(region);

  return (
    <>
      {lead ? (
        <BoothHero labelledBy="hero-h">
          <div className="booth-backdrop" aria-hidden="true">
            {lead.backdrop_path ? (
              <img src={img(lead.backdrop_path, 'w1280')!} srcSet={`${img(lead.backdrop_path, 'w780')} 780w, ${img(lead.backdrop_path, 'w1280')} 1280w, ${img(lead.backdrop_path, 'original')} 1920w`}
                sizes="100vw" alt="" fetchPriority="high" />
            ) : <img src={img(lead.poster_path, 'w780')!} alt="" />}
          </div>
          <div className="booth-dark" aria-hidden="true" />
          <div className="booth-veil" aria-hidden="true" />
          <div className="booth-grain" aria-hidden="true" />
          <div className="booth-inner">
            <div className="booth-copy">
              <p className="booth-eyebrow">{today()} · No. {rank(lead)} on TMDB this week</p>
              <h1 id="hero-h" className={`booth-title${lead.title.length > 18 ? ' is-long' : ''}`}><span className="booth-kicker">Now showing</span><a href={`/film/${lead.id}`}>{lead.title}</a></h1>
              <p className="booth-meta">{[yearOf(lead), genreLine(lead, 3)].filter(Boolean).join(' · ')}</p>
              {lead.overview ? <p className="booth-overview">{lead.overview}</p> : null}
              <div className="booth-actions">
                <a className="booth-btn booth-btn-amber" href="/match/night"><Icon name="users" size={18} />Plan a movie night</a>
                <a className="booth-btn booth-btn-ghost" href="/director"><Icon name="clapperboard" size={18} />Ask Reel Director</a>
                <SaveToggle film={saveable(lead)} label="text" />
              </div>
            </div>
            <YourNight />
          </div>
        </BoothHero>
      ) : null}

      {films.length ? <Ticker label={asOf('Trending on TMDB this week')} items={films.slice(0, 20).map((m) => ({ id: m.id, title: m.title, year: yearOf(m) }))} /> : null}

      <div className="page booth">
        {!trend.ok ? <Problem info={trend.problem} /> : !lead ? null : (
          <section className="programme" aria-labelledby="prog-h">
            <header className="booth-head">
              <p className="booth-label">The programme</p>
              <h2 id="prog-h" className="booth-h2">This week’s most watched</h2>
              <p className="type-caption vm-faint">{asOf('Ranked by TMDB’s weekly trending list')}</p>
            </header>
            <div className="prog-grid">
              {feature ? (
                <TiltCard as="article" className="prog-feature">
                  <img className="prog-feature-img" src={img(feature.backdrop_path, 'w780')!} srcSet={`${img(feature.backdrop_path, 'w780')} 780w, ${img(feature.backdrop_path, 'w1280')} 1280w`} sizes="(min-width: 1024px) 640px, 100vw" alt="" loading="lazy" />
                  <div className="prog-feature-text">
                    <span className="prog-rank">No. {rank(feature)}</span>
                    <h3 className={`prog-feature-title${feature.title.length > 22 ? ' is-long' : ''}`}><a className="stretch" href={`/film/${feature.id}`}>{feature.title}</a></h3>
                    <p className="prog-feature-meta">{[yearOf(feature), genreLine(feature)].filter(Boolean).join(' · ')}</p>
                    {feature.overview ? <p className="prog-feature-overview">{feature.overview}</p> : null}
                  </div>
                  <div className="prog-save"><SaveToggle film={saveable(feature)} /></div>
                </TiltCard>
              ) : null}
              {pair.map((m) => (
                <TiltCard as="article" key={m.id} className="prog-poster" data-film-card="">
                  <div data-poster="" className="prog-poster-art"><Poster {...posterSet(m.poster_path, 'w342')} sizes="(min-width: 1024px) 260px, 45vw" title={m.title} year={yearOf(m)} size="fill" /></div>
                  <div className="prog-poster-text">
                    <span className="prog-rank">No. {rank(m)}</span>
                    <h3 className="prog-poster-title"><a className="stretch" href={`/film/${m.id}`}>{m.title}</a></h3>
                    <p className="prog-poster-meta">{[yearOf(m), genreLine(m)].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="prog-save"><SaveToggle film={saveable(m)} /></div>
                </TiltCard>
              ))}
              {listed.length ? (
                <ol className="prog-list" role="list">
                  {listed.map((m) => (
                    <li key={m.id} className="prog-line" data-film-card="">
                      <span className="prog-line-rank" aria-hidden="true">{rank(m)}</span>
                      <div data-poster="" className="prog-line-art"><Poster {...posterSet(m.poster_path)} sizes="64px" title={m.title} size="fill" /></div>
                      <div className="prog-line-text">
                        <h3><a className="stretch" href={`/film/${m.id}`}><span className="vm-sr">Number {rank(m)}: </span>{m.title}</a></h3>
                        <p className="type-caption vm-muted">{[yearOf(m), genreLine(m)].filter(Boolean).join(' · ')}</p>
                      </div>
                      <SaveToggle film={saveable(m)} />
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </section>
        )}

        {cinemas.ok ? (cinemas.value.length ? (
          <section className="booth-rail reveal" aria-labelledby="cin-h">
            <header className="booth-head">
              <p className="booth-label">On the big screen</p>
              <h2 id="cin-h" className="booth-h2">New in cinemas</h2>
              <p className="type-caption vm-faint">{asOf(`Now playing in ${place}, from TMDB`)}. Drag, swipe or use the arrows.</p>
            </header>
            <DragRail label="New in cinemas">
              {cinemas.value.filter((m) => m.poster_path).slice(0, 16).map((m) => <RailCard key={m.id} m={m} />)}
            </DragRail>
          </section>
        ) : null) : <Problem info={cinemas.problem} compact />}

        <section className="circle-room reveal" aria-labelledby="circle-h">
          <div className="seats" aria-hidden="true">{Array.from({ length: 5 }, (_, r) => <span key={r} className="seat-row" style={{ ['--r' as string]: r }} />)}</div>
          <div className="circle-copy">
            <p className="booth-label">Now showing in your circle</p>
            <h2 id="circle-h" className="booth-h2">The seats are empty, for now</h2>
            <p className="type-body vm-muted">When accounts arrive, the people you follow fill this room: what they rated, what they’re reviewing, the lists they’re making. Nothing here is invented in the meantime.</p>
            <div className="circle-actions">
              <a className="booth-link" href="/discover"><Icon name="compass" size={18} />Find films to start with</a>
              <a className="booth-link" href="/viewmo"><Icon name="globe" size={18} />Spin the ViewMo sphere</a>
            </div>
          </div>
        </section>

        {gems.ok && gems.value.length ? (
          <section className="booth-rail reveal" aria-labelledby="gems-h">
            <header className="booth-head">
              <p className="booth-label">Off the beaten track</p>
              <h2 id="gems-h" className="booth-h2">Hidden gems</h2>
              <p className="type-caption vm-faint">{HIDDEN_GEMS_RULE}</p>
            </header>
            <DragRail label="Hidden gems">
              {gems.value.filter((m) => m.poster_path).slice(0, 16).map((m) => <RailCard key={m.id} m={m} />)}
            </DragRail>
          </section>
        ) : null}
      </div>
    </>
  );
}

function RailCard({ m }: { m: MovieSummary }) {
  return (
    <li className="rail-card" data-film-card="">
      <div data-poster="" className="rail-card-art"><Poster {...posterSet(m.poster_path, 'w342')} sizes="(min-width: 768px) 180px, 40vw" title={m.title} year={yearOf(m)} size="fill" /></div>
      <h3 className="rail-card-title"><a className="stretch" href={`/film/${m.id}`}>{m.title}</a></h3>
      <p className="type-caption vm-muted">{[yearOf(m), m.vote_count ? `${m.vote_average.toFixed(1)} on TMDB` : null].filter(Boolean).join(' · ')}</p>
      <div className="rail-card-save"><SaveToggle film={{ id: m.id, title: m.title, year: yearOf(m), posterPath: m.poster_path }} /></div>
    </li>
  );
}
