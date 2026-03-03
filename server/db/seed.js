require('dotenv').config();
const pool = require('./pool');

const QUESTIONS = [
  { id: 'remove_duplicates_sorted_ll', tag: 'Linked Lists',    title: 'Remove Duplicates (Sorted)',      difficulty: 'easy'   },
  { id: 'insert_remove_node',          tag: 'Linked Lists',    title: 'insertNode and removeNode',        difficulty: 'medium' },
  { id: 'split_even_odd',              tag: 'Linked Lists',    title: 'Split Even/Odd',                   difficulty: 'medium' },
  { id: 'duplicate_reverse',           tag: 'Linked Lists',    title: 'Duplicate Reverse',                difficulty: 'medium' },
  { id: 'find_union',                  tag: 'Linked Lists',    title: 'Find Union',                       difficulty: 'medium' },
  { id: 'move_even_to_back',           tag: 'Linked Lists',    title: 'Move Even Items to Back',          difficulty: 'easy'   },
  { id: 'move_max_to_front',           tag: 'Linked Lists',    title: 'Move Max to Front',                difficulty: 'easy'   },
  { id: 'move_min_node',               tag: 'Linked Lists',    title: 'Move Min Node to Front',           difficulty: 'easy'   },
  { id: 'move_odd_to_back',            tag: 'Linked Lists',    title: 'Move Odd Items to Back',           difficulty: 'easy'   },
  { id: 'reverse_between',             tag: 'Linked Lists',    title: 'Reverse Between m and n',          difficulty: 'hard'   },
  { id: 'find_before_middle',          tag: 'Linked Lists',    title: 'Find Node Before Middle',          difficulty: 'medium' },
  { id: 'reverse_stack_queue',         tag: 'Stacks & Queues', title: 'Reverse Stack using Queue',        difficulty: 'easy'   },
  { id: 'reverse_queue_mn',            tag: 'Stacks & Queues', title: 'Reverse Queue m to n',             difficulty: 'medium' },
  { id: 'middle_of_stack',             tag: 'Stacks & Queues', title: 'Middle of Stack',                  difficulty: 'medium' },
  { id: 'reverse_second_half',         tag: 'Stacks & Queues', title: 'Reverse Second Half of Queue',     difficulty: 'hard'   },
  { id: 'sort_stack',                  tag: 'Stacks & Queues', title: 'Sort a Stack',                     difficulty: 'medium' },
  { id: 'count_leaf_nodes',            tag: 'Binary Trees',    title: 'Count Leaf Nodes',                 difficulty: 'easy'   },
  { id: 'count_nonleaf_nodes',         tag: 'Binary Trees',    title: 'Count Non-Leaf Nodes',             difficulty: 'easy'   },
  { id: 'tree_height',                 tag: 'Binary Trees',    title: 'Tree Height',                      difficulty: 'easy'   },
  { id: 'level_order',                 tag: 'Binary Trees',    title: 'Level Order Traversal',            difficulty: 'medium' },
  { id: 'is_balanced',                 tag: 'Binary Trees',    title: 'Is Balanced',                      difficulty: 'medium' },
  { id: 'lowest_common_ancestor',      tag: 'Binary Trees',    title: 'Lowest Common Ancestor',           difficulty: 'hard'   },
  { id: 'bst_insert',                  tag: 'BST',             title: 'BST Insert',                       difficulty: 'easy'   },
  { id: 'bst_search',                  tag: 'BST',             title: 'BST Search',                       difficulty: 'easy'   },
  { id: 'bst_delete',                  tag: 'BST',             title: 'BST Delete',                       difficulty: 'hard'   },
  { id: 'bst_validate',                tag: 'BST',             title: 'Validate BST',                     difficulty: 'medium' },
  { id: 'bst_kth_smallest',            tag: 'BST',             title: 'Kth Smallest in BST',              difficulty: 'medium' },
  // Quiz questions
  { id: 'quiz_q1_reverse_queue',       tag: 'Stacks & Queues', title: 'Q1 Reverse Queue m..n',            difficulty: 'medium' },
  { id: 'quiz_q2_count_leaf',          tag: 'Binary Trees',    title: 'Q2 Count Leaf Nodes',              difficulty: 'easy'   },
  { id: 'quiz_q3_middle_stack',        tag: 'Stacks & Queues', title: 'Q3 Middle of Stack',               difficulty: 'medium' },
  { id: 'quiz_q4_intersect',           tag: 'Linked Lists',    title: 'Q4 Intersect Two LLs',             difficulty: 'hard'   },
  { id: 'quiz_q5_reverse_ll',          tag: 'Linked Lists',    title: 'Q5 Reverse LL m..n',               difficulty: 'hard'   },
  { id: 'quiz_q6_count_nonleaf',       tag: 'Binary Trees',    title: 'Q6 Count Non-Leaf',                difficulty: 'easy'   },
  { id: 'quiz_q7_reverse_half',        tag: 'Stacks & Queues', title: 'Q7 Reverse 2nd Half Queue',        difficulty: 'hard'   },
  { id: 'quiz_q8_before_middle',       tag: 'Linked Lists',    title: 'Q8 Before-Middle of Stack',        difficulty: 'medium' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding questions…');
    for (const q of QUESTIONS) {
      await client.query(
        `INSERT INTO questions (id, tag, title, difficulty)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE
           SET tag=EXCLUDED.tag, title=EXCLUDED.title, difficulty=EXCLUDED.difficulty`,
        [q.id, q.tag, q.title, q.difficulty]
      );
    }
    console.log(`✓ Seeded ${QUESTIONS.length} questions`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

seed().then(() => process.exit(0));
