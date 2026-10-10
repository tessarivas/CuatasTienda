// Piezas de carga ("skeletons") compartidas por las páginas del panel. Cada
// página arma la suya con estas piezas en su propio `*-skeleton.tsx`, junto
// al componente real cuya forma imita.
export { CardSkeleton } from "./card-skeleton";
export { ListRowsSkeleton } from "./list-rows-skeleton";
export { PageHeaderSkeleton } from "./page-header-skeleton";
export { TableRowsSkeleton, type SkeletonCell } from "./table-rows-skeleton";
