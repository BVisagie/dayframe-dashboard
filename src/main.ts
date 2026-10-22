import { mount } from 'svelte';
import 'virtual:bootstrap.css';
import './styles/index.css';
import './styles/app.scss';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
