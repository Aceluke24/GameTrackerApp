import { useEffect, useMemo, useState } from 'react';
import { formatTime } from '../api/igdb';
import { STATUSES } from '../App';
import './StatsPage.css';

const MINUTES_PER_DAY_PLAYED = 120;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function scoreBacklog(games) {
  const backlog = games.filter(g => g.status === 'backlog');
  if (backlog.length === 0) return [];

  const times = backlog.map(g => g.hltb_main).filter(Boolean);
  const ratings = backlog.map(g => g.igdb_rating).filter(Boolean);
  const dates = backlog.map(g => g.date_added ? new Date(g.date_added).getTime() : Date.now());

  const maxTime = times.length ? Math.max(...times) : 1;
  const maxRating = ratings.length ? Math.max(...ratings) : 1;
  const oldestTime = dates.length ? Math.min(...dates) : Date.now();
  const newestTime = dates.length ? Math.max(...dates) : Date.now();
  const dateRange = (newestTime - oldestTime) || 1;

  return backlog
    .map(g => {
      // Shorter games score higher — up to 40pts
      const timeScore = g.hltb_main
        ? (1 - Math.min(g.hltb_main, maxTime) / maxTime) * 40
        : 20;

      // Higher-rated games score higher — up to 40pts
      const ratingScore = g.igdb_rating
        ? (g.igdb_rating / maxRating) * 40
        : 20;

      // Games that have been sitting in the backlog longer score higher — up to 20pts
      const addedTime = g.date_added ? new Date(g.date_added).getTime() : newestTime;
      const ageScore = ((newestTime - addedTime) / dateRange) * 20;

      return { ...g, score: timeScore + ratingScore + ageScore };
    })
    .sort((a, b) => b.score - a.score);
}

function pickWeighted(scored, excludeId) {
  const pool = scored.filter(g => g.id !== excludeId);
  const candidates = pool.length > 0 ? pool : scored;
  const totalWeight = candidates.reduce((sum, g) => sum + Math.max(g.score, 1), 0);
  let r = Math.random() * totalWeight;
  for (const g of candidates) {
    r -= Math.max(g.score, 1);
    if (r <= 0) return g;
  }
  return candidates[candidates.length - 1];
}

export default function StatsPage({ games }) {
  const scoredBacklog = useMemo(() => scoreBacklog(games), [games]);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    setRecommendation(scoredBacklog.length > 0 ? scoredBacklog[0] : null);
  }, [scoredBacklog]);

  function handleReroll() {
    if (scoredBacklog.length === 0) return;
    setRecommendation(pickWeighted(scoredBacklog, recommendation?.id));
  }

  const stats = useMemo(() => {
    const backlogGames = games.filter(g => g.status === 'backlog' || g.status === 'playing');
    const totalBacklogMinutes = backlogGames.reduce((sum, g) => sum + (g.hltb_main || 0), 0);

    const daysToComplete = totalBacklogMinutes / MINUTES_PER_DAY_PLAYED;
    const yearsToComplete = daysToComplete / 365;

    const platforms = {};
    games.forEach(g => {
      const platform = g.platform || 'Unknown';
      if (!platforms[platform]) platforms[platform] = { total: 0, finished: 0, backlogMinutes: 0 };
      platforms[platform].total++;
      if (g.status === 'finished') platforms[platform].finished++;
      if (g.status === 'backlog' || g.status === 'playing') {
        platforms[platform].backlogMinutes += g.hltb_main || 0;
      }
    });
    const sortedPlatforms = Object.entries(platforms).sort((a, b) => b[1].total - a[1].total);
    const maxPlatformGames = sortedPlatforms[0]?.[1].total || 1;

    const genres = {};
    games.forEach(g => {
      if (!g.genres) return;
      g.genres.split(', ').forEach(genre => {
        genres[genre] = (genres[genre] || 0) + 1;
      });
    });
    const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxGenreCount = sortedGenres[0]?.[1] || 1;

    const started = games.filter(g => ['finished', 'abandoned', 'want_again'].includes(g.status)).length;
    const finished = games.filter(g => g.status === 'finished' || g.status === 'want_again').length;
    const finishRate = started > 0 ? Math.round((finished / started) * 100) : 0;

    return {
      total: games.length,
      totalBacklogMinutes, daysToComplete, yearsToComplete,
      sortedPlatforms, maxPlatformGames,
      sortedGenres, maxGenreCount,
      started, finished, finishRate,
    };
  }, [games]);

  if (games.length === 0) {
    return (
      <div className="stats-empty">
        <div className="empty-icon">📊</div>
        <p>Add some games to see your stats!</p>
      </div>
    );
  }

  const debtDisplay = stats.yearsToComplete >= 1
    ? `${stats.yearsToComplete.toFixed(1)} years`
    : `${Math.round(stats.daysToComplete)} days`;

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1>Your Vault Stats</h1>
        <p className="stats-sub">{stats.total} games tracked</p>
      </div>

      <div className="stats-hero-row">
        <div className="stats-hero stats-hero-time">
          <div className="hero-label">Total Backlog Time</div>
          <div className="hero-value mono">{formatTime(stats.totalBacklogMinutes)}</div>
          <div className="hero-sub">of main story content left</div>
        </div>

        <div className="stats-hero stats-hero-debt">
          <div className="hero-label">Backlog Debt</div>
          <div className="hero-value mono">{debtDisplay}</div>
          <div className="hero-sub">at 2 hours of play per day</div>
        </div>

        <div className="stats-hero stats-hero-finish">
          <div className="hero-label">Finish Rate</div>
          <div className="hero-value mono">{stats.finishRate}%</div>
          <div className="hero-sub">{stats.finished} finished of {stats.started} started</div>
        </div>
      </div>

      {recommendation && (
        <div className="stats-section">
          <h2>Play Next</h2>
          <div className="recommendation-card">
            {recommendation.cover_url && (
              <img src={recommendation.cover_url} alt={recommendation.title} className="rec-cover" />
            )}
            <div className="rec-info">
              <div className="rec-title">{recommendation.title}</div>
              <div className="rec-platform">{recommendation.platform}</div>
              <div className="rec-meta">
                {recommendation.hltb_main > 0 && (
                  <span>⏱ {formatTime(recommendation.hltb_main)} main story</span>
                )}
                {recommendation.igdb_rating && (
                  <span>⭐ {recommendation.igdb_rating}/100 on IGDB</span>
                )}
                {recommendation.genres && (
                  <span>🎮 {recommendation.genres}</span>
                )}
              </div>
              <div className="rec-reason">
                Smart pick based on length, rating, and time in your backlog
              </div>
            </div>
            <button className="rec-reroll" onClick={handleReroll} title="Get another pick">
              🎲 Reroll
            </button>
          </div>
        </div>
      )}

      <div className="stats-row">
        <div className="stats-section stats-section-half">
          <h2>By Status</h2>
          <div className="status-bars">
            {STATUSES.map(s => {
              const count = games.filter(g => g.status === s.key).length;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={s.key} className="bar-row">
                  <div className="bar-label">
                    <span>{s.emoji} {s.label}</span>
                    <span className="mono">{count}</span>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill status-bar-${s.key}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="bar-pct mono">{Math.round(pct)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {stats.sortedGenres.length > 0 && (
          <div className="stats-section stats-section-half">
            <h2>By Genre</h2>
            <div className="status-bars">
              {stats.sortedGenres.map(([genre, count]) => {
                const pct = (count / stats.maxGenreCount) * 100;
                return (
                  <div key={genre} className="bar-row">
                    <div className="bar-label">
                      <span>{genre}</span>
                      <span className="mono">{count}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill bar-fill-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="bar-pct mono">{Math.round((count / stats.total) * 100)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h2>By Platform</h2>
        <div className="platform-cards">
          {stats.sortedPlatforms.map(([platform, data]) => {
            const libraryPct = (data.total / stats.maxPlatformGames) * 100;
            const completedPct = data.total > 0 ? (data.finished / data.total) * 100 : 0;
            return (
              <div key={platform} className="platform-card">
                <div className="platform-header">
                  <span className="platform-name">{platform}</span>
                  <span className="platform-count mono">{data.total} games</span>
                </div>
                <div className="platform-bar-group">
                  <div className="platform-bar-label"><span>Library</span></div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-accent" style={{ width: `${libraryPct}%` }} />
                  </div>
                </div>
                <div className="platform-bar-group">
                  <div className="platform-bar-label">
                    <span>Completed</span>
                    <span className="mono">{Math.round(completedPct)}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill bar-fill-success" style={{ width: `${completedPct}%` }} />
                  </div>
                </div>
                {data.backlogMinutes > 0 && (
                  <div className="platform-backlog">
                    ⏱ <span className="mono">{formatTime(data.backlogMinutes)}</span> left in backlog
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}