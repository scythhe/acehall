import { mountAceHall } from '../lib';
import { demoConfig } from './demoConfig';
import { stubAdapter } from './stubAdapter';

const target = document.getElementById('app');
if (!target) throw new Error('Demo page is missing the #app element.');

mountAceHall(target, { config: demoConfig, adapter: stubAdapter });
