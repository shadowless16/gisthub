// app/admin/posts/PostList.tsx
import { List, Datagrid, TextField } from 'react-admin';

export const PostList = (props: any) => (
  <List {...props}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="title" />
      <TextField source="body" />
    </Datagrid>
  </List>
);