from django.shortcuts import render
from django.http import HttpResponse

def auth_list(request):
    return HttpResponse("Hola login")