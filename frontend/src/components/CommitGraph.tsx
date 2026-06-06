
import { toast } from 'react-hot-toast';

interface Commit {
  sha: string;
  full_sha: string;
  author: string;
  msg: string;
  date: string;
  parent_ids: string[];
}

interface CommitGraphProps {
  commits: Commit[];
  selectedCommitSha: string | null;
  onCommitSelect: (sha: string) => void;
  onDiffLoaded: (diff: any) => void;
  onDiffLoading: () => void;
}

const LANE_COLORS = ['#a663cc', '#00f2fe', '#2ecc71', '#e67e22', '#ff6b9d', '#ffd93d'];
const LANE_W = 18;
const NODE_R = 5;
const ROW_H = 48;

export function CommitGraph({ commits, selectedCommitSha, onCommitSelect, onDiffLoaded, onDiffLoading }: CommitGraphProps) {
  if (!commits || commits.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>No commits found</p>
        <p style={{ fontSize: '0.7rem', marginTop: '4px' }}>Push code to your branch to populate the commit graph.</p>
      </div>
    );
  }

  // Build lane assignment: each commit gets a lane (column index)
  const shaToIndex = new Map<string, number>();
  commits.forEach((c, i) => shaToIndex.set(c.sha, i));

  const lanes: number[] = new Array(commits.length).fill(0);
  const activeLanes: (string | null)[] = [];

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    let myLane = activeLanes.indexOf(c.sha);
    if (myLane === -1) {
      const freeSlot = activeLanes.indexOf(null);
      if (freeSlot !== -1) {
        myLane = freeSlot;
      } else {
        myLane = activeLanes.length;
        activeLanes.push(null);
      }
    }
    lanes[i] = myLane;

    if (c.parent_ids.length > 0) {
      activeLanes[myLane] = c.parent_ids[0];
    } else {
      activeLanes[myLane] = null;
    }

    for (let p = 1; p < c.parent_ids.length; p++) {
      const parentSha = c.parent_ids[p];
      if (!activeLanes.includes(parentSha)) {
        const freeSlot = activeLanes.indexOf(null);
        if (freeSlot !== -1) {
          activeLanes[freeSlot] = parentSha;
        } else {
          activeLanes.push(parentSha);
        }
      }
    }
  }

  const maxLanes = Math.max(...lanes, 0) + 1;
  const svgW = maxLanes * LANE_W + 12;

  return (
    <div className="commit-list" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
      {commits.map((c, index) => {
        const isActive = selectedCommitSha === c.sha;
        const lane = lanes[index];
        const cx = lane * LANE_W + LANE_W / 2 + 4;
        const cy = ROW_H / 2;
        const color = LANE_COLORS[lane % LANE_COLORS.length];

        const svgLines: React.ReactNode[] = [];

        if (index > 0) {
          for (let prev = 0; prev < index; prev++) {
            const pc = commits[prev];
            if (pc.parent_ids[0] === c.sha) {
              const prevCx = lanes[prev] * LANE_W + LANE_W / 2 + 4;
              if (lanes[prev] === lane) {
                svgLines.push(
                  <line key={`v-${prev}`} x1={cx} y1={0} x2={cx} y2={cy - NODE_R}
                    stroke={color} strokeWidth={2} opacity={0.5} />
                );
              } else {
                svgLines.push(
                  <path key={`m-${prev}`}
                    d={`M ${prevCx} 0 C ${prevCx} ${cy * 0.6}, ${cx} ${cy * 0.4}, ${cx} ${cy - NODE_R}`}
                    stroke={LANE_COLORS[lanes[prev] % LANE_COLORS.length]}
                    strokeWidth={2} fill="none" opacity={0.4} />
                );
              }
            }
            if (pc.parent_ids.includes(c.sha) && pc.parent_ids[0] !== c.sha) {
              const prevCx = lanes[prev] * LANE_W + LANE_W / 2 + 4;
              svgLines.push(
                <path key={`mp-${prev}`}
                  d={`M ${prevCx} 0 C ${prevCx} ${cy * 0.5}, ${cx} ${cy * 0.5}, ${cx} ${cy - NODE_R}`}
                  stroke={LANE_COLORS[lanes[prev] % LANE_COLORS.length]}
                  strokeWidth={2} fill="none" opacity={0.35} strokeDasharray="4,3" />
              );
            }
          }
        }

        if (index < commits.length - 1) {
          const hasChildBelow = commits.slice(index + 1).some(
            (fc) => fc.parent_ids.includes(c.sha)
          );
          if (hasChildBelow) {
            svgLines.push(
              <line key="down" x1={cx} y1={cy + NODE_R} x2={cx} y2={ROW_H}
                stroke={color} strokeWidth={2} opacity={0.4} />
            );
          }
        }

        return (
          <div
            key={c.sha}
            className={`commit-item ${isActive ? 'active' : ''}`}
            style={{ cursor: 'pointer', minHeight: ROW_H }}
            onClick={async () => {
              onCommitSelect(c.sha);
              onDiffLoading();
              try {
                const res = await fetch(`/api/gitlab/commit-diff/${c.full_sha || c.sha}`);
                if (res.ok) {
                  const data = await res.json();
                  onDiffLoaded(data);
                }
              } catch (err) {
                console.error('Failed to load commit diff:', err);
                toast.error('Could not load diff for this commit');
              }
            }}
          >
            <svg width={svgW} height={ROW_H} style={{ flexShrink: 0 }}>
              {svgLines}
              <circle cx={cx} cy={cy} r={isActive ? NODE_R + 2 : NODE_R}
                fill={isActive ? color : '#09080d'}
                stroke={color} strokeWidth={2}
                style={{ filter: isActive ? `drop-shadow(0 0 6px ${color})` : 'none' }}
              />
            </svg>
            <div className="commit-card-body">
              <div className="commit-meta" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="commit-sha">{c.sha}</span>
                  <span className="commit-author" style={{ color: 'var(--text-muted)' }}>@{c.author}</span>
                  {c.parent_ids.length > 1 && (
                    <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: 4, background: 'rgba(166,99,204,0.15)', color: '#a663cc', fontWeight: 600 }}>MERGE</span>
                  )}
                </div>
                <div className="commit-message" title={c.msg}>{c.msg}</div>
              </div>
              <div className="commit-date">{c.date || '—'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
