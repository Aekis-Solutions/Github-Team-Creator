declare namespace React {
  export default interface RefObject<T> {
    current: T | null;
  }
}
