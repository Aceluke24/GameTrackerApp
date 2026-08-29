import { useEffect, useMemo, useState } from 'react';
import { formatTime } from '../api/igdb';
import { scoreBacklog, pickWeighted } from '../utils/backlogScore';
import { computeLibraryStats } from '../utils/libraryStats';
import './StatsPage.css';

export default function StatsPage({ games, statuses }) {
  const scoredBacklog = useMemo(() => scoreBacklog(games), [games]);
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    setRecommendation(scoredBacklog.length > 0 ? scoredBacklog[0] : null);
  }, [scoredBacklog]);

  function handleReroll() {
    if (scoredBacklog.length === 0) return;
    setRecommendation(pickWeighted(scoredBacklog, recommendation?.id));
  }

  const stats = useMemo(() => computeLibraryStats(games), [games]);

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
            {statuses.map(s => {
              const count = games.filter(g => g.status === s.key).length;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={s.key} className="bar-row">
                  <div className="bar-label">
                    <span>{s.emoji} {s.label}</span>
                    <span className="mono">{count}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${pct}%`, background: s.color }} />
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