'use client';

// ==================================================
// FILE: frontend/src/components/menu-tree/menu-tree.tsx
// FUNGSI: Render menu departemen sebagai dua lapis yang gampang dipindai:
// (1) kartu utama - ukuran seragam, untuk fitur tanpa sub-menu, dan
// (2) kartu grup berwarna (Transport, GS, dll) yang membungkus sub-menunya
// sebagai baris rapi, bukan kotak-di-dalam-kotak. Dipakai bersama oleh
// halaman HC/GA/CIVIL/ADMINISTRASI.
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

type Collapsed =
  | { type: 'leaf'; node: MenuTreeNode; kickers: string[] }
  | { type: 'group'; node: MenuTreeNode; kickers: string[] };

function saring(nodes: MenuTreeNode[], bolehLihat: (key: string) => boolean): MenuTreeNode[] {
  return nodes
    .filter((node) => bolehLihat(node.accessKey))
    .map((node) =>
      node.children
        ? { ...node, children: saring(node.children, bolehLihat) }
        : node,
    );
}

/**
 * Node tanpa anak selalu jadi leaf langsung. Node dengan TEPAT satu anak
 * dianggap "pembungkus" (mis. Outdoor > Potong Rumput) dan diratakan jadi
 * satu baris memakai data si anak, sambil menyimpan nama node pembungkus
 * sebagai "kicker" (label kecil). Node dengan >1 anak adalah grup asli.
 */
function collapseNode(node: MenuTreeNode, kickers: string[] = []): Collapsed {
  if (!node.children || node.children.length === 0) {
    return { type: 'leaf', node, kickers };
  }

  if (node.children.length === 1) {
    return collapseNode(node.children[0], [...kickers, node.title]);
  }

  return { type: 'group', node, kickers };
}

/** Buang kicker yang isinya sama persis dengan judul leaf (pembungkus nama ganda, mis. HC "Database Karyawan"). */
function labelKicker(kickers: string[], judulLeaf: string): string {
  return kickers.filter((k) => k.trim().toLowerCase() !== judulLeaf.trim().toLowerCase()).join(' · ');
}

export function MenuTree({ nodes, bolehLihat }: MenuTreeProps) {
  const tampil = saring(nodes, bolehLihat);

  if (tampil.length === 0) {
    return null;
  }

  const kartu: Collapsed[] = [];
  const grup: Collapsed[] = [];

  for (const node of tampil) {
    const hasil = collapseNode(node);
    (hasil.type === 'leaf' ? kartu : grup).push(hasil);
  }

  return (
    <div className={styles.root}>
      {kartu.length > 0 && (
        <div className={styles.primaryGrid}>
          {kartu.map((item) => (
            <PrimaryCard key={item.node.key} node={item.node} kicker={labelKicker(item.kickers, item.node.title)} />
          ))}
        </div>
      )}

      {grup.length > 0 && (
        <div className={styles.sectionGrid}>
          {grup.map((item) => (
            <SectionCard key={item.node.key} node={item.node} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionCard({ node }: { node: MenuTreeNode }) {
  const Icon = node.icon;
  const style = {
    '--accent': node.accent ?? '#0868f6',
    '--soft': node.soft ?? '#eaf2ff',
  } as React.CSSProperties;

  return (
    <article className={styles.sectionCard} style={style}>
      <div className={styles.sectionHeader}>
        {Icon ? (
          <span className={styles.sectionIcon}>
            <Icon size={21} />
          </span>
        ) : null}
        <div className={styles.sectionText}>
          <h2 className={styles.sectionTitle}>{node.title}</h2>
          {node.description ? <p className={styles.sectionDesc}>{node.description}</p> : null}
        </div>
      </div>

      <Rows nodes={node.children ?? []} />
    </article>
  );
}

function Rows({ nodes }: { nodes: MenuTreeNode[] }) {
  return (
    <>
      {nodes.map((node) => {
        const hasil = collapseNode(node);

        if (hasil.type === 'leaf') {
          return <LeafRow key={node.key} node={hasil.node} kicker={labelKicker(hasil.kickers, hasil.node.title)} />;
        }

        const awalan = labelKicker(hasil.kickers, hasil.node.title);

        return (
          <div key={node.key} className={styles.subgroup}>
            <p className={styles.subLabel} style={{ color: hasil.node.accent ?? '#8a5a20' }}>
              {awalan ? `${awalan} · ` : ''}
              {hasil.node.title}
            </p>
            <Rows nodes={hasil.node.children ?? []} />
          </div>
        );
      })}
    </>
  );
}

function PrimaryCard({ node, kicker }: { node: MenuTreeNode; kicker: string }) {
  const Icon = node.icon;
  const bisaDiklik = Boolean(node.href);

  const style = {
    '--accent': node.accent ?? '#0868f6',
    '--soft': node.soft ?? '#eaf2ff',
  } as React.CSSProperties;

  const isi = (
    <>
      <div className={styles.primaryTop}>
        {Icon ? (
          <span className={styles.primaryIcon}>
            <Icon size={22} />
          </span>
        ) : null}
        {bisaDiklik ? <ArrowRight className={styles.primaryArrow} size={17} /> : null}
      </div>

      <div className={styles.primaryContent}>
        {kicker ? <span className={styles.primaryKicker}>{kicker}</span> : null}
        <h3 className={styles.primaryTitle} data-kosong={!bisaDiklik}>
          {node.title}
        </h3>
        {node.description ? <p className={styles.primaryDesc}>{node.description}</p> : null}
      </div>

      {node.status ? (
        <span className={styles.primaryStatus} data-kosong={!bisaDiklik}>
          {node.status}
        </span>
      ) : null}

      {node.pendingCount ? (
        <span className={styles.pendingBadge} title={`${node.pendingCount} menunggu approval Anda`}>
          {node.pendingCount > 99 ? '99+' : node.pendingCount}
        </span>
      ) : null}
    </>
  );

  if (bisaDiklik) {
    return (
      <Link href={node.href!} className={styles.primaryCard} style={style}>
        {isi}
      </Link>
    );
  }

  return (
    <article className={`${styles.primaryCard} ${styles.primaryCardKosong}`} style={style}>
      {isi}
    </article>
  );
}

function LeafRow({ node, kicker }: { node: MenuTreeNode; kicker: string }) {
  const Icon = node.icon;
  const bisaDiklik = Boolean(node.href);

  const style = {
    '--accent': node.accent ?? '#0868f6',
    '--soft': node.soft ?? '#eaf2ff',
  } as React.CSSProperties;

  const isi = (
    <>
      <span className={styles.leafIconWrap}>
        {Icon ? (
          <span className={styles.leafIcon} data-kosong={!bisaDiklik}>
            <Icon size={18} />
          </span>
        ) : null}
        {node.pendingCount ? (
          <span className={styles.pendingBadgeKecil} title={`${node.pendingCount} menunggu approval Anda`}>
            {node.pendingCount > 99 ? '99+' : node.pendingCount}
          </span>
        ) : null}
      </span>

      <div className={styles.leafContent}>
        {kicker ? <span className={styles.leafKicker}>{kicker}</span> : null}
        <strong className={styles.leafTitle} data-kosong={!bisaDiklik}>
          {node.title}
        </strong>
        {node.description ? <span className={styles.leafDesc}>{node.description}</span> : null}
      </div>

      {node.status ? (
        <span className={styles.leafStatus} data-kosong={!bisaDiklik}>
          {node.status}
        </span>
      ) : null}

      {bisaDiklik ? (
        <ArrowRight className={styles.leafArrow} size={16} />
      ) : (
        <span className={styles.leafArrowKosong} />
      )}
    </>
  );

  if (bisaDiklik) {
    return (
      <Link href={node.href!} className={styles.leafRow} style={style}>
        {isi}
      </Link>
    );
  }

  return (
    <div className={styles.leafRow} style={style}>
      {isi}
    </div>
  );
}
