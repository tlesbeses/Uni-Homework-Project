from django.shortcuts import render
from django.http import HttpResponse

def user_list(request):
    return HttpResponse("Hola usuarios")