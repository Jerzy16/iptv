import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'channelNumber', standalone: true })
export class ChannelNumberPipe implements PipeTransform {
  transform(index: number): string {
    return `1.${index + 1}`;
  }
}
