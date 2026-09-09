import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import './App.css'

function TodoPage() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React Router basics', done: false },
  ])
  const [text, setText] = useState('')

  function addTodo(event) {
    event.preventDefault()
    const next = text.trim()
    if (!next) return
    setTodos((current) => [...current, { id: Date.now(), text: next, done: false }])
    setText('')
  }

  function toggleTodo(id) {
    setTodos((current) =>
      current.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    )
  }

  function removeTodo(id) {
    setTodos((current) => current.filter((todo) => todo.id !== id))
  }

  return (
    <main className="todo-app">
      <h1>Todo Demo</h1>

      <form className="todo-form" onSubmit={addTodo}>
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add a todo"
          aria-label="New todo"
        />
        <button type="submit">Add</button>
      </form>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className={todo.done ? 'done' : ''}>{todo.text}</span>
            </label>
            <button type="button" onClick={() => removeTodo(todo.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<TodoPage />} />
    </Routes>
  )
}

export default App
