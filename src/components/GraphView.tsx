import React, { useMemo } from "react";
import { motion } from "motion/react";
import { RepoState, VirtualCommit } from "../types";
import { HelpCircle, GitCommit, AlertTriangle, Bookmark as BookmarkIcon } from "lucide-react";

interface GraphViewProps {
  repoState: RepoState;
  onSelectCommit?: (commitId: string) => void;
}

interface NodeLayout {
  id: string;
  commit: VirtualCommit;
  x: number;
  y: number;
  label: string;
}

export const GraphView: React.FC<GraphViewProps> = ({ repoState, onSelectCommit }) => {
  const { commits, bookmarks, workingCopyId } = repoState;

  // Compute a simple, elegant visual layout for commits
  const layout = useMemo(() => {
    const nodes: { [id: string]: NodeLayout } = {};
    const rootId = "00000000";

    // 1. Calculate heights (longest distance from root)
    const heights: { [id: string]: number } = {};
    const getCommitHeight = (id: string): number => {
      if (id in heights) return heights[id];
      const commit = commits[id];
      if (!commit || commit.parents.length === 0) {
        heights[id] = 0;
        return 0;
      }
      const parentHeights = commit.parents.map(pId => getCommitHeight(pId));
      const maxParentHeight = Math.max(...parentHeights);
      heights[id] = maxParentHeight + 1;
      return heights[id];
    };

    // Calculate height for all commits
    Object.keys(commits).forEach(id => getCommitHeight(id));

    // Find the maximum height
    const maxH = Math.max(...Object.values(heights), 1);

    // 2. Assign columns to commits
    // We want parallel commits to sit in separate columns
    const columns: { [id: string]: number } = {};
    const parentToChildren: { [parentId: string]: string[] } = {};
    
    // Initialize children map
    Object.keys(commits).forEach(id => {
      parentToChildren[id] = [];
    });
    
    (Object.values(commits) as VirtualCommit[]).forEach(c => {
      c.parents.forEach(pId => {
        if (parentToChildren[pId]) {
          parentToChildren[pId].push(c.id);
        }
      });
    });

    // BFS or DFS from root to assign columns
    columns[rootId] = 0; // Root is always center column
    const visited = new Set<string>();
    visited.add(rootId);

    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = parentToChildren[currentId] || [];
      
      // Sort children to ensure deterministic ordering (e.g. by description or ID)
      children.sort((a, b) => a.localeCompare(b));

      // Spread children horizontally
      const parentCol = columns[currentId];
      if (children.length === 1) {
        columns[children[0]] = parentCol;
        if (!visited.has(children[0])) {
          visited.add(children[0]);
          queue.push(children[0]);
        }
      } else if (children.length > 1) {
        // e.g., if 2 children, columns: parentCol - 0.8, parentCol + 0.8
        // if 3 children, columns: parentCol - 1, parentCol, parentCol + 1
        const spread = 1.0;
        const startOffset = -((children.length - 1) * spread) / 2;
        children.forEach((childId, idx) => {
          columns[childId] = parentCol + startOffset + idx * spread;
          if (!visited.has(childId)) {
            visited.add(childId);
            queue.push(childId);
          }
        });
      }
    }

    // fallback for any disconnected commits (e.g., during active rebasing)
    Object.keys(commits).forEach(id => {
      if (columns[id] === undefined) {
        columns[id] = 0;
      }
    });

    // Define pixel coordinates
    // SVG Dimensions: width 100%, height is dynamic. We can map:
    // X coordinate: centered around x=200, spaced by 90px
    // Y coordinate: from Y=50 (top, newest commits) to Y = heights * 85px + 50
    const paddingX = 220;
    const spacingX = 120;
    const spacingY = 70;
    const offsetTop = 45;

    const list: NodeLayout[] = Object.keys(commits).map(id => {
      const commit = commits[id];
      const h = heights[id] !== undefined ? heights[id] : 0;
      const col = columns[id] !== undefined ? columns[id] : 0;

      // Invert Y so root (h=0) is at the bottom of the graph, and newest commits are at the top
      const yVal = offsetTop + (maxH - h) * spacingY;
      const xVal = paddingX + col * spacingX;

      return {
        id,
        commit,
        x: xVal,
        y: yVal,
        label: commit.description || "(no description)",
      };
    });

    return { nodes: list, nodeMap: list.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {} as { [id: string]: NodeLayout }) };
  }, [commits, workingCopyId]);

  // Find bookmarks pointing to each commit ID
  const commitBookmarks = useMemo(() => {
    const map: { [commitId: string]: string[] } = {};
    Object.entries(bookmarks as Record<string, string>).forEach(([bName, cId]) => {
      if (!map[cId]) map[cId] = [];
      map[cId].push(bName);
    });
    return map;
  }, [bookmarks]);

  // Generate SVG lines (Bezier curves) connecting children to parents
  const connections = useMemo(() => {
    const list: { id: string; d: string; isConflicted: boolean }[] = [];
    layout.nodes.forEach(node => {
      node.commit.parents.forEach(parentId => {
        const parentNode = layout.nodeMap[parentId];
        if (parentNode) {
          // Draw smooth Bezier curve from child (top node) to parent (bottom node)
          const x1 = node.x;
          const y1 = node.y;
          const x2 = parentNode.x;
          const y2 = parentNode.y;
          
          // Control points for vertical curves
          const cy1 = y1 + (y2 - y1) * 0.4;
          const cy2 = y1 + (y2 - y1) * 0.6;
          
          const dStr = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
          list.push({
            id: `${node.id}-${parentId}`,
            d: dStr,
            isConflicted: node.commit.isConflicted && parentNode.commit.isConflicted,
          });
        }
      });
    });
    return list;
  }, [layout]);

  return (
    <div className="relative w-full h-[250px] bg-[#fdfdfd] border border-slate-200/80 rounded-xl overflow-y-auto overflow-x-hidden shadow-sm p-4 custom-scrollbar">
      {/* Background radial dot grid layout */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(#e5e7eb 1.5px, transparent 1.5px)", backgroundSize: "28px 28px", opacity: 0.8 }} />

      {/* Background visual indicators */}
      <div className="absolute top-3 right-4 flex items-center gap-4 text-xs font-mono text-slate-400 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse inline-block" />
          <span className="text-slate-500">Active (@)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-slate-500">Conflict</span>
        </div>
      </div>

      <div className="absolute top-3 left-4 text-[10px] font-mono text-slate-400 font-bold tracking-wider z-10 select-none pointer-events-none uppercase">
        Repository Graph Visualizer
      </div>

      <svg className="w-full min-h-[220px] relative z-10" style={{ minWidth: "500px" }}>
        <defs>
          <linearGradient id="gradient-line" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradient-conflict" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.4" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Connections (Lines) */}
        {connections.map(conn => (
          <motion.path
            key={conn.id}
            d={conn.d}
            fill="none"
            stroke={conn.isConflicted ? "url(#gradient-conflict)" : "url(#gradient-line)"}
            strokeWidth={conn.isConflicted ? 2.5 : 2}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            strokeDasharray={conn.isConflicted ? "4 4" : undefined}
          />
        ))}

        {/* Commit Nodes */}
        {layout.nodes.map(node => {
          const isActive = node.commit.isWorkingCopy;
          const isConflicted = node.commit.isConflicted;
          const isRoot = node.id === "00000000";
          
          let nodeColor = "fill-slate-700 stroke-white";
          if (isRoot) {
            nodeColor = "fill-slate-300 stroke-white";
          } else if (isActive) {
            nodeColor = "fill-indigo-600 stroke-white";
          } else if (isConflicted) {
            nodeColor = "fill-amber-500 stroke-white";
          }

          const nodeBookmarks = commitBookmarks[node.id] || [];

          return (
            <g
              key={node.id}
              className="cursor-pointer group"
              onClick={() => onSelectCommit?.(node.id)}
            >
              {/* Highlight Ring for active/selected */}
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={15}
                  className="fill-none stroke-indigo-100 ring-4 ring-indigo-50"
                  strokeWidth={4.5}
                />
              )}

              {/* Node Circle */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={9}
                className={`${nodeColor} transition-colors duration-200`}
                strokeWidth={2}
                whileHover={{ r: 11, strokeWidth: 2.5 }}
                layoutId={`circle-${node.id}`}
              />

              {/* Node inner symbol for working copy */}
              {isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={3.5}
                  className="fill-white"
                />
              )}

              {/* Node inner symbol for Conflict */}
              {isConflicted && !isActive && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={3.5}
                  className="fill-white"
                />
              )}

              {/* Commit and Change IDs */}
              <g transform={`translate(${node.x + 18}, ${node.y - 4})`}>
                {/* Bookmarks list, if any */}
                {nodeBookmarks.map((bName, idx) => (
                  <g key={bName} transform={`translate(0, ${-18 - idx * 20})`}>
                    <rect
                      x={-2}
                      y={-12}
                      width={bName.length * 7 + 22}
                      height={16}
                      rx={3}
                      className="fill-indigo-50 stroke-indigo-150"
                      strokeWidth={1}
                    />
                    <path
                      d="M2 -8 L14 -8"
                      className="stroke-indigo-400"
                      strokeWidth={1}
                    />
                    <text
                      x={14}
                      y={0}
                      className="fill-indigo-700 font-mono font-bold"
                      style={{ fontSize: "9px" }}
                    >
                      {bName}
                    </text>
                  </g>
                ))}

                {/* Commit IDs text */}
                {!isRoot && (
                  <text className="font-mono font-medium fill-slate-700" style={{ fontSize: "11px" }}>
                    <tspan className="fill-indigo-600 font-bold">{node.commit.changeId.slice(0, 4)}</tspan>
                    <tspan className="fill-slate-400"> ({node.commit.id.slice(0, 4)})</tspan>
                  </text>
                )}
                {isRoot && (
                  <text className="font-mono font-bold fill-slate-400" style={{ fontSize: "11px" }}>
                    root() <tspan className="font-normal">(zzzzzzzz)</tspan>
                  </text>
                )}

                {/* Commit Message / Description */}
                <text
                  y={15}
                  className={`font-sans ${isActive ? "fill-indigo-600 font-medium" : isConflicted ? "fill-amber-600 font-medium" : "fill-slate-500"} truncate max-w-[180px]`}
                  style={{ fontSize: "11px" }}
                >
                  {isRoot ? "" : node.commit.description ? `"${node.commit.description}"` : "(no description)"}
                </text>
              </g>

              {/* Inline warning badge for Conflict */}
              {isConflicted && (
                <g transform={`translate(${node.x - 24}, ${node.y - 12})`}>
                  <rect
                    width={16}
                    height={16}
                    rx={8}
                    className="fill-amber-50 stroke-amber-400"
                    strokeWidth={1}
                  />
                  <text
                    x={8}
                    y={12}
                    textAnchor="middle"
                    className="fill-amber-700 font-mono font-bold"
                    style={{ fontSize: "10px" }}
                  >
                    !
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
