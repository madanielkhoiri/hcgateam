'use client';

// ==================================================
// FILE: frontend/src/components/menu-tree/menu-tree.tsx
// FUNGSI: Render pohon menu departemen sebagai outline bertingkat -
// tiap section tampil sebagai pembatas horizontal (seperti judul
// halaman departemen), dan card asli yang bisa diklik dikumpulkan
// dalam grid rapi tepat di bawah pembatas terdekatnya. Dipakai
// bersama oleh halaman HC/GA/CIVIL/ADMINISTRASI.
// ==================================================

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './menu-tree.module.css';

export type MenuTreeNode = {
  /** Unik dalam satu pohon - dipakai sebagai React key. */
  key: string;
  title: string;
  description?: string;
  status?: string;
  href?: string;
  icon?: React.ElementType;
  /** Access key yang menentukan tampil/tidaknya node ini (dan seluruh isinya). */
  accessKey: string;
  accent?: string;
  soft?: string;
  /** Jumlah item yang menunggu approval dari akun yang sedang login (misal Work Order menunggu SH). Badge cuma tampil kalau > 0. */
  pendingCount?: number;
  children?: MenuTreeNode[];
};

type MenuTreeProps = {
  nodes: MenuTreeNode[];
  bolehLihat: (accessKey: string) => boolean;
};

function saring(nodes: MenuTreeNode[], bolehLihat: (key: string) => boolean): MenuTreeNode[] {
  return nodes
    .filter((node) => bolehLihat(node.accessKey))
    .map((node) =>
      node.children
        ? { ...node, children: saring(node.children, bolehLihat) }
        : node,
    );
}

export function MenuTree({ nodes, bolehLihat }: MenuTreeProps) {
  const tampil = saring(nodes, bolehLihat);

  if (tampil.length === 0) {
    return null;
  }

  return <div className={styles.root}>{renderLevel(tampil, 0)}</div>;
}

/**
 * Satu level pohon: card polos (tanpa anak) dikumpulkan jadi satu grid,
 * lalu tiap node yang punya anak dirender sebagai pembatas + isinya
 * (rekursif) di bawahnya.
 */
function renderLevel(nodes: MenuTreeNode[], depth: number) {
  const cards = nodes.filter((node) => !node.children || node.children.length === 0);
  const sections = nodes.filter((node) => node.children && node.children.length > 0);

  return (
    <>
      {cards.length > 0 ? (
        <div className={styles.cardGrid} data-depth={depth}>
          {cards.map((node) => (
            <LeafCard key={node.key} node={node} />
          ))}
        </div>
      ) : null}

      {sections.map((node) => (
        <div key={node.key} className={styles.sectionBlock}>
          <SectionDivider node={node} depth={depth} />
          <div className={styles.sectionBody}>
            {renderLevel(node.children!, depth + 1)}
          </div>
        </div>
      ))}
    </>
  );
}

function SectionDivider({ node, depth }: { node: MenuTreeNode; depth: number }) {
  const Icon = node.icon;
  const style = {
    '--accent': node.accent ?? '#0868f6',
    '--soft': node.soft ?? '#eaf2ff',
  } as React.CSSProperties;

  return (
    <div className={styles.divider} data-depth={depth} style={style}>
      {Icon ? (
        <span className={styles.dividerIcon} data-depth={depth}>
          <Icon size={depth === 0 ? 20 : 16} />
        </span>
      ) : null}

      <div className={styles.dividerText}>
        <h2 className={styles.dividerTitle} data-depth={depth}>
          {node.title}
        </h2>
        {node.description ? (
          <p className={styles.dividerDesc}>{node.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function LeafCard({ node }: { node: MenuTreeNode }) {
  const Icon = node.icon;
  const bisaDiklik = Boolean(node.href);

  const style = {
    '--accent': node.accent ?? '#0868f6',
    '--soft': node.soft ?? '#eaf2ff',
  } as React.CSSProperties;

  const isi = (
    <>
      {Icon ? (
        <span className={styles.cardIcon}>
          <Icon size={22} />
        </span>
      ) : null}

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle} data-kosong={!bisaDiklik}>
          {node.title}
        </h3>
        {node.description ? <p className={styles.cardDesc}>{node.description}</p> : null}
        {node.status ? (
          <span className={styles.cardStatus} data-kosong={!bisaDiklik}>
            {node.status}
          </span>
        ) : null}
      </div>

      {bisaDiklik ? <ArrowRight className={styles.cardArrow} size={17} /> : null}

      {node.pendingCount ? (
        <span className={styles.pendingBadge} title={`${node.pendingCount} menunggu approval Anda`}>
          {node.pendingCount > 99 ? '99+' : node.pendingCount}
        </span>
      ) : null}
    </>
  );

  if (bisaDiklik) {
    return (
      <Link href={node.href!} className={styles.card} style={style}>
        {isi}
      </Link>
    );
  }

  return (
    <article className={`${styles.card} ${styles.cardKosong}`} style={style}>
      {isi}
    </article>
  );
}
