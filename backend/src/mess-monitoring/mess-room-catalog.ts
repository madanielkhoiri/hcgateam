export type MessRoomCatalogBuilding = {
  value: string;
  label: string;
  floors: Array<{ value: string; label: string; rooms: string[] }>;
};

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => String(start + index));

export const MESS_ROOM_CATALOG: MessRoomCatalogBuilding[] = [
  ...['A', 'B', 'C', 'D', 'E', 'F'].map((building) => ({
    value: building,
    label: `Mess ${building}`,
    floors: [
      { value: '1', label: 'Lantai 1', rooms: range(101, 117).map((number) => `${building}${number}`) },
      { value: '2', label: 'Lantai 2', rooms: range(201, 218).map((number) => `${building}${number}`) },
    ],
  })),
  ...['1', '2', '3'].map((building) => ({
    value: building,
    label: `Staff ${building}`,
    floors: [
      { value: '1', label: 'Lantai 1', rooms: range(Number(`${building}101`), Number(`${building}116`)) },
      { value: '2', label: 'Lantai 2', rooms: range(Number(`${building}201`), Number(`${building}218`)) },
    ],
  })),
];

export const MESS_ROOM_CATALOG_ROWS = MESS_ROOM_CATALOG.flatMap((building) =>
  building.floors.flatMap((floor) =>
    floor.rooms.map((number) => ({ building: building.value, number })),
  ),
);
