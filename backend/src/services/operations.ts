// Simple Operational Transform for conflict resolution
export interface Operation {
  type: "insert" | "delete" | "retain";
  content?: string;
  length: number;
}

export interface DocumentState {
  content: string;
  version: number;
}

// Transform operations to handle conflicts
export function transformOperations(
  op1: Operation[],
  op2: Operation[]
): { op1Prime: Operation[]; op2Prime: Operation[] } {
  const op1Prime: Operation[] = [];
  const op2Prime: Operation[] = [];

  let i1 = 0,
    i2 = 0;

  while (i1 < op1.length || i2 < op2.length) {
    const op1Curr = op1[i1];
    const op2Curr = op2[i2];

    if (!op1Curr) {
      if (op2Curr) op2Prime.push(op2Curr);
      i2++;
      continue;
    }

    if (!op2Curr) {
      op1Prime.push(op1Curr);
      i1++;
      continue;
    }

    if (op1Curr.type === "retain" && op2Curr.type === "retain") {
      const minLength = Math.min(op1Curr.length, op2Curr.length);
      op1Prime.push({ type: "retain", length: minLength });
      op2Prime.push({ type: "retain", length: minLength });

      if (op1Curr.length > minLength) {
        op1[i1] = { type: "retain", length: op1Curr.length - minLength };
      } else {
        i1++;
      }

      if (op2Curr.length > minLength) {
        op2[i2] = { type: "retain", length: op2Curr.length - minLength };
      } else {
        i2++;
      }
    } else if (op1Curr.type === "insert" && op2Curr.type === "retain") {
      op1Prime.push(op1Curr);
      op2Prime.push({ type: "retain", length: op1Curr.content?.length || 0 });
      i1++;
    } else if (op1Curr.type === "retain" && op2Curr.type === "insert") {
      op1Prime.push({ type: "retain", length: op2Curr.content?.length || 0 });
      if (op2Curr) op2Prime.push(op2Curr);
      i2++;
    } else if (op1Curr.type === "insert" && op2Curr.type === "insert") {
      // Both inserting - order by user ID for consistency
      const order = op1Curr.content?.localeCompare(op2Curr.content || "") || 0;
      if (order <= 0) {
        op1Prime.push(op1Curr);
        op2Prime.push({ type: "retain", length: op1Curr.content?.length || 0 });
        i1++;
      } else {
        op1Prime.push({ type: "retain", length: op2Curr.content?.length || 0 });
        if (op2Curr) op2Prime.push(op2Curr);
        i2++;
      }
    } else if (op1Curr.type === "delete" && op2Curr.type === "retain") {
      op1Prime.push(op1Curr);
      i1++;
    } else if (op1Curr.type === "retain" && op2Curr.type === "delete") {
      if (op2Curr) op2Prime.push(op2Curr);
      i2++;
    } else if (op1Curr.type === "delete" && op2Curr.type === "delete") {
      const minLength = Math.min(op1Curr.length, op2Curr.length);
      op1Prime.push({ type: "delete", length: minLength });
      op2Prime.push({ type: "delete", length: minLength });

      if (op1Curr.length > minLength) {
        op1[i1] = { type: "delete", length: op1Curr.length - minLength };
      } else {
        i1++;
      }

      if (op2Curr.length > minLength) {
        op2[i2] = { type: "delete", length: op2Curr.length - minLength };
      } else {
        i2++;
      }
    }
  }

  return { op1Prime, op2Prime };
}

// Apply operations to document content
export function applyOperations(
  content: string,
  operations: Operation[]
): string {
  let result = "";
  let pos = 0;

  for (const op of operations) {
    switch (op.type) {
      case "retain":
        result += content.slice(pos, pos + op.length);
        pos += op.length;
        break;
      case "insert":
        result += op.content || "";
        break;
      case "delete":
        pos += op.length;
        break;
    }
  }

  return result;
}

// Convert text changes to operations (simplified)
export function textToOperations(
  oldText: string,
  newText: string
): Operation[] {
  const operations: Operation[] = [];
  let i = 0;

  // Find common prefix
  while (
    i < oldText.length &&
    i < newText.length &&
    oldText[i] === newText[i]
  ) {
    i++;
  }

  if (i > 0) {
    operations.push({ type: "retain", length: i });
  }

  // Find common suffix
  let j = oldText.length - 1;
  let k = newText.length - 1;

  while (j >= i && k >= i && oldText[j] === newText[k]) {
    j--;
    k--;
  }

  // Delete removed characters
  if (j >= i) {
    operations.push({ type: "delete", length: j - i + 1 });
  }

  // Insert new characters
  if (k >= i) {
    operations.push({
      type: "insert",
      content: newText.slice(i, k + 1),
      length: k - i + 1,
    });
  }

  return operations;
}
