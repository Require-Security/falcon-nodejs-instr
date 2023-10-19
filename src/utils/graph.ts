export class Node<T> {
  data: T;
  adjacent: Node<T>[];

  /**
   * Construct a new node instance wrapping some data.  Keep in mind
   * that adjacent nodes are traversed in the same order that it was
   * added.
   *
   * @param {T} data
   */
  constructor(data: T) {
    this.data = data;
    this.adjacent = [];
  }

  add_adjacent(node: Node<T>): void {
    this.adjacent.push(node);
  }

  remove_adjacent(data: T): Node<T> | null {
    const index = this.adjacent.findIndex(
      (node) => node.data === data
    );

    if (index > -1) {
      return this.adjacent.splice(index, 1)[0];
    }

    return null;
  }
}

export class Graph<T> {
  nodes: Map<T, Node<T>> = new Map();

  /**
   * Construct a new graph from an (optional) adjancency list.
   *
   * @param {Array<[T,T[]]>} adj_list: an optional mapping of nodes to an
   *   array of it's respective adjancent nodes.
   */
  constructor(adj_list: Array<[T,T[]]> | null = null) {
    if (adj_list !== null) {
      const adj_map = new Map(adj_list)
      const keyNodes = [];
      for (let node of adj_map.keys()) {
        keyNodes.push(this.add_node(node));
      }
      for (let [node, adjNodes] of adj_map.entries()) {
        const nodeFrom = this.nodes.get(node)
        if (!nodeFrom) {
          // We should obviously never see this, but...
          throw new Error(`Missing 'from' node in adjacency list`)
        }
        for (let i = 0; i < adjNodes.length; i++) {
          // We can safely add the node here without a check since
          // our implementation will return the existing node if
          // trying to add duplicate data items.
          const nodeTo = this.add_node(adjNodes[i])
          nodeFrom.add_adjacent(nodeTo)
        }
      }
    }
  }

  /**
   * Add a new node (only if it has not already been added).
   *
   * @param {T} data
   * @returns {Node<T>}
   */
  add_node(data: T): Node<T> {
    let node = this.nodes.get(data);
    if (node) return node;

    node = new Node(data);
    this.nodes.set(data, node);

    return node;
  }

  /**
   * Remove a node and all adjacent edges.
   *
   * @param {T} data
   * @returns {Node<T> | null}
   */
  remove_node(data: T): Node<T> | null {
    const to_remove = this.nodes.get(data);
    if (!to_remove) return null;

    this.nodes.forEach((node) => {
      node.remove_adjacent(to_remove.data);
    });

    this.nodes.delete(data);

    return to_remove;
  }

  /**
   * Create an edge between two nodes.
   *
   * @param {T} src: source node
   * @param {T} dest: destination node
   */
  add_edge(src: T, dest: T): void {
    const src_node = this.add_node(src);
    const dest_node = this.add_node(dest);

    src_node.add_adjacent(dest_node);
  }

  /**
   * Remove an edge between two nodes.
   *
   * @param {T} src: source node
   * @param {T} dest: destination node
   */
  remove_edge(src: T, dest: T): void {
    const src_node = this.nodes.get(src);
    const dest_node = this.nodes.get(dest);

    if (src_node && dest_node) {
      src_node.remove_adjacent(dest);
    }
  }

  /**
   * Walks a graph via DFS in lexicographical order.
   *
   * @param {(from: T, to: T) => void} visitor
   */
  walk(start: T, visitor: (from: T, to: T) => void) {
    const visited: Map<T, boolean> = new Map();
    const node = this.nodes.get(start);

    if (node == undefined) {
      throw new Error(
        `Start node (${start}) not found in graph: ${this.nodes}`
      );
    } else {
      this.dfs(node, visited, visitor);
    }
  }

  /**
   * Depth-first search
   *
   * @param {T} data
   * @param {Map<T, boolean>} visited
   * @param {(from: T, to: T) => void} visitor
   */
  private dfs(node: Node<T>, visited: Map<T, boolean>,
              visitor: (from: T, to: T) => void): void {
    if (!node) return;

    visited.set(node.data, true);

    node.adjacent.forEach((item) => {
      if (!visited.has(item.data)) {
        visitor(node.data, item.data);
        this.dfs(item, visited, visitor);
      }
    });
  }
}
